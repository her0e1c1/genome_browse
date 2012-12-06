//global settings
var _genome;

/*
memo

画像データ
画像データをもつリスト
リストを複数用意(tracks)

更新する？
リストの中身更新
画像をずらすだけ

描写する
tracksを表示
画像をずらす

イベントハンドラ

*/

/*
スクロールの注意
右にスクロールする場合は
ゲノムの配列の番号の小さい方を表示するので
逆に動く

画像の名前は1001, 1101,1201のように決めてあるため、
1222などをリクエストする場合は、
1201に修正する必要があります。
*/

/*
 一枚あたりの画像の幅
 画像の幅はGBrowseで生成していくときに決定しますので
 この値は変更できません。
*/
var IMAGE_WIDTH = 800;
var IMAGE_HEIGHT = 400;

//計算しやすい様に奇数
var IMAGE_NUMBER = 5;

var PATH = {images: "/static/images/"};


//サーバーから必要なゲノム情報
//配列の最長 本来は割り切れるような数ではありません。
var MAX_LENGTH = 30000000; //30M

//取得するデータ名
var TRACK_NAME = ["sample"];

function _D(str){
	var d = $("#debug")
		.append("<p/>")
		.children(":last")
		.html(str);

}
function _DEBUG(){

	var txt = "";
	left = $("#show_images").position().left;
	txt += "; view.start:" + _genome.get_view().start;
	txt += "; view.stop:" + _genome.get_view().stop;
	txt += ";<br /> update_point.start:" + _genome.get_imagelist().get_update_point().start;
	txt += "; update_point.stop:" + _genome.get_imagelist().get_update_point().stop;
	txt += "; <br />point.start:" + _genome.get_imagelist().point.start;
	txt += "; point.stop:" + _genome.get_imagelist().point.stop;

	$("#debug").html(txt);
}


//private class
Image = function(start, layer, name){
	//private 変数
	//これらの値は書き換えてはなりません。
	this.start = start;
	this.layer = layer;
	this.name = name;
	/*
	  画像を取得する場合
	  取得するパスsrcは
	  /static/images/name/layer/start.png
	  のようになっています。
	*/
	this.src = _make_src_path(start, layer, name)
	this.stop = start + layer - 1;

	function _make_src_path(start, layer, name){
		var src;
		start = start + ".png";
		var src = _join(_join(PATH.images, name), layer);
		src = src + start;
		console.log("image path: " + src);
		return src;
	}
	//パスをつなげる
	function _join(root, path){
		return root + path + "/";
	}
};

/*
  Imageクラスを格納するクラス
  取得した画像を格納する配列
  必ず隣同士が連番な鎖状のデータ構造

  startの値が小さい方が、配列の先頭側にきます。
 */

ImageList = function(){
	this.init.apply(this, arguments);
};
/*
  pointは先頭の０番目に合わせます。
*/
ImageList.prototype = {
	init: function(start, layer, name){
		this.start = start;
		this.layer = layer;
		this.name = name;
		this.images = new Array(IMAGE_NUMBER);
		this.point = this._get_each_side_point(start, layer);
		//画像データを生成する
		for(var i = 0; i < IMAGE_NUMBER; i++){
			var i,st;
			st = this.point.start + layer * i;
			img = new Image(st, layer, name);
			this.images[i] = img;
		}
		this.update_point = this.get_update_point();

	},
	update: function(left_or_right){
		var img;
		if(left_or_right === 1){
			img = this._get_left_side_image();
		}
		else if(left_or_right === -1){
			img = this._get_right_side_image();
		}
		else{
			return;
		}
		this._add(img);
		this.update_point = this.get_update_point();
		return this.images;
	},
	get_update_point: function(){
		var point = {
			start: this.images[0].stop,
			stop: this.images[IMAGE_NUMBER - 1].start,
		}
		return point;
	},
	_get_left_side_image: function(){
		var st;
		st = this.point.start - this.layer;
		return new Image(st, this.layer, this.name);
	},
	_get_right_side_image: function(){
		var st;
		st = this.point.stop + 1;
		return new Image(st, this.layer, this.name)
	},
	_add: function(image){
		var start = image.start;
		var stop = image.stop;
		if(this.point.start - 1 === stop){
			this.images.pop();
			this.images.unshift(image);
			this.point.start -= this.layer;
			this.point.stop -= this.layer
		}
		else if(this.point.stop + 1 === start){
			this.images.shift();
			this.images.push(image);
			this.point.start += this.layer;
			this.point.stop += this.layer
		}
		else{
			console.log("can't add image!");
		}
	},
	/*
	  (501, 300)の引き数の場合
	  (301,800)を返します。
	*/
	_get_each_side_point: function(start, layer){
		var st, sp, stop, size;
		stop = start + layer - 1;
		//奇数ということが前提です。
		size = (IMAGE_NUMBER - 1) / 2;
			st = start - layer * size;
		sp = stop + layer * size;

		//エラー処理が必要
		//if(st < 1){};
			//if(sp > max);

		var point = {
			start: st,
				stop: sp
		};
		return point;
	},
};


/*
 genomeモジュールはjqueryに依存しています。
 クライアントの仕事
 staticにある画像を表示します。

todo:viewの書き換えるタイミングをあわせる

 */
(function(window){

	var genome = function(){
		this.init.apply(this, arguments);
	};

	//public methods
	genome.prototype = {
		/*
		  nameは複数扱えるように配列になります。
		  imagelistも配列です。ImageListのクラスの配列になります。
		 */
		init: function(start, layer, name){
			//public変数
			this.view;

			/* layerは偶数条件付きです。 */
			this.layer;
			this.name;
			this.imagelists;

			// スクロールに対して、移動の微調整をする変数です。
			this.SCROLL_WIGHT = 0.001;

			//select>optionの値
			this.LAYER_VALUES =  [
				100,
				200,
				1000, //1k
				2000,
				5000,
				10000, //10k
				20000,
				50000,
				100000, //100k
				200000,
				500000,
				1000000, //1M
			];

			//layerの最小値です。
			this.MIN_LAYER = this.LAYER_VALUES[0];

			//htmlの初期化
			this._init_set_options();

			//event登録
			this._event_controler_select();
			this._event_controler_button();
			this._event_enter_input_view_start();
			this._event_scroll_show_images();
			this._event_overview();
			this._event_region();

			//一回目の画像の表示
			this.first_show(start, layer, name);
		},

		//private変数にアクセスするメソッド
		//getメソッド
		get_view : function(){
			this.view.stop = this.get_view_stop(this.view.start);
			return this.view;
		},
		get_layer: function(){
			return this.layer;
		},
		get_imagelist: function(){
			return this.imagelists[0];
		},

		/*
		  pointについては、配列の０番目にあわせます。
		 */
		get_point: function(){
			return this.imagelists[0].point;
		},

		get_update_point: function(){
			return this.imagelists[0].get_update_point();
		},

		/*
		  画像の幅とDNAの配列の幅は異なります。
		  スクロールなどの処理をしても、ずれないようにします。
		*/
		get_width_per_dna: function(){
			return IMAGE_WIDTH / this.layer ;
		},

		/*
		  画像の名前はGBrowseで生成するときに、
		  予め決まっていますので、任意の値のstartを
		  変換して、サーバー上にある画像の名前のに一致させます。
		  (1234,100)の場合は1201を返します。
		  ここでのoffsetは33です。
		 */
		get_modifiedstart: function(start, layer){
			if(layer === undefined){
				layer = this.layer;
			}
			var offset = (start % layer) - 1;
			return (start - offset);
		},

		/*
		  startとlayerからstopの値は算出します。
		 */
		get_view_stop :function(start, layer){
			if(layer === undefined){
				layer = this.layer;
			}
			return start + layer - 1;
		},

		//layerの値と一致した番号を返します。
		get_index_of_layer: function(){
			for(var i = 0; i < this.LAYER_VALUES.length; i++){
				if(this.layer === this.LAYER_VALUES[i]){
					return i;
				}
			}
			alert("layerが不適切な値です。")
		},

		//viewとpointの差です。
		get_current_offset: function(){
			return this.view.start - this.imagelists[0].point.start;
		},
		
		/*
		  表示している画像をoffsetの差だけずらします。

		  view.startが1001で、offsetが200の場合
		  view.startは1201になります。

		 todo: viewはここで書き換えます。

		 modeのとる文字列
		 undefined(point) => point.startからの差をとります。
		 view => view.startからの差をとります。
		 */
		slide_with_offset: function(offset, mode){
			var node = $("#show_images img");
			var left;

			if(mode === undefined ||
			   mode === "point"){
				//一度初期化します。
				left = 0;
				node.css("left", left);
				this.view.start = this.get_point().start;
			}
			else if(mode === "view"){
				left = _px2int(node.eq(0).css("left"));
			}
			else{
				alert(mode +"は不適切な値です。");
				return;
			}

			this.view.start += offset;
			left -= offset * this.get_width_per_dna();
			node.css("left", left);

			//this.update();
		},

		/*
		  画像の再度読み込みは、こちらの関数で行います。
		  init関数では、
		  htmlの初期化
		  eventハンドラの登録
		  を行いますので、
		  画像の再描写のみであれば、こちらを呼びます。
		 */
		first_show: function(start, layer, name){

			var stop = this.get_view_stop(start);
			this.view ={
				start: start,
				stop: stop,
			};
			this.layer = layer;
			this.name = name;
			this.imagelists = new Array();

			//未設定の場合の初期値を設定します。
			if(name.length === 0){
				alert("何も選択されていません。");
				return;
			}

			if(start === undefined){
				start = 1;
			}

			if(layer === undefined){
				this.layer = this.MIN_LAYER;
			}
			//layerの初期値を選択させておきます。
			$("#controller_select").val(this.layer);

			/*
			  残像が残る可能性があります。
			  一度imgの属性srcを削除します。
			 */
			$("#show_images img").removeAttr("src");

			/*
			  画像の開始が1234のような中途半端な値の場合にも
			  対応できるようにします。
			*/
			var _start = this.get_modifiedstart(start, layer);
			for(var i = 0; i < name.length; i++){
				this.imagelists.push(new ImageList(_start, layer, name[i]));
			}
			//描画
			this.show();
		},

		/*
		  imgaelistのデータを全て表示します。
		 */
		show_images: function(){
			var n = $("#show_images");
			//子供の要素を一度中身をリセットします。
			n.empty();
			n.attr("height", IMAGE_HEIGHT);
			for(var j = 0; j < this.imagelists.length; j++){
				n.append("<div></div>");
				var child = n.children(":last");
				for(var i = 0; i < IMAGE_NUMBER; i++){
					child.append("<img />");
					var grand_child = child.children(":last");
					grand_child.attr("src", this.imagelists[j].images[i].src);
				}
			}
		},

		/*
		  画像の描画は
		  (1)ImageListsの配列を全て表示
		  (2)view.startから表示するために画像をずらす
		  (3)内部データを表示させます。
		  以上のことを実行します。

		  この関数を呼ぶ前には、imagelistsは更新しておく必要があります。
		 */
		show: function(){
			this.show_images();
			var offset = this.get_current_offset();
			this.slide_with_offset(offset);
			this.show_info();
		},
		show_info: function(){
			$("#input_view_start").val(this.view.start);
		},

		/*
		  update_pointに達していた場合
		  画像の描写を更新します。
		 */
		update: function(){
			var update_point = this.get_update_point();

			/*
			  条件に合致したらimagelistを書き換えます。
			  (IMAGE_NUMBER) - 1 / 2回
			  IMAGE_NUMBERが奇数である条件が効いています。
			*/
			var left_or_right;
			if(update_point.start > this.view.start){
				left_or_right = +1;
			}
			else if(update_point.stop < this.view.stop){
				left_or_right = -1;
			}
			else{
				/*
				  条件に当てはまらない場合は
				  画像をずらすだけです。
				  つまり、画像の書き換えはしませんが、
				  表示するデータの変更はします。
				*/
				this.show_info();
				return;
			}
			for(var j = 0; j < this.imagelists.length; j++){
				for(var i = 0; i < (IMAGE_NUMBER - 1) / 2; i++ ){
					this.imagelists[j].update(left_or_right);
				}
			}
			this.show();
		},

		//eventハンドラー

		/*
		  left_or_right
		  -1の場合　左へ更新
		  +1の場合　右へ更新
		  sizeが1のとき一枚分移動します。
		*/
		_update_click_button: function (left_or_right, size){
			var scroll_size = (this.layer * left_or_right) * size;
			this.slide_with_offset(scroll_size, "view");
			this.update();
		},

		/*
		  現在のstartとnameのままでlayerだけ変更します。
		  中央を表示するために
		  スタートの位置をview.startとview.stopの真ん中にします。

		  1501 ~ 1600のとき、1000に縮小する場合
		  1551が中央値になります。
		  よって
		  1051 ~ 2050までを表示します。

		  拡大する場合は上記を下から辿っていきますが、
		  結局同じアルゴリズムになります。
		*/
		_event_controler_select: function(){
			var node = $("#controller_select");
			var self = this;

			node.change(function(){
				var new_layer;
				new_layer = parseInt($(this).children(":selected").val());
				//計算を簡略化するために、layerは偶数という条件がつきます。
				var mediam = self.view.start + (self.layer / 2);
				var start = mediam - (new_layer / 2);
				self.first_show(start, new_layer, self.name);

			});

		},

		/*
		  画像を移動する6つのボタン(<< < - +  > >>)の制御をします。

		  bug: 連打すると更新についていけてないようです。
		 */
		_event_controler_button: function(){
			var self = this;
			var left = $("#controller_button_left");
			var dleft = $("#controller_button_double_left");
			var right = $("#controller_button_right");
			var dright = $("#controller_button_double_right");
			var plus = $("#controller_button_plus");
			var minus = $("#controller_button_minus");

			left.click(function(){
				self._update_click_button(-1, 1/5);
			});
			dleft.click(function(){
				self._update_click_button(-1, 1);
			});

			right.click(function(){
				self._update_click_button(+1, 1/5);
			});
			dright.click(function(){
				self._update_click_button(+1, 1);
			});

			plus.click(function(){
				var index = self.get_index_of_layer();
				index++;
				if(self.LAYER_VALUES.length > index){
					var new_layer = self.LAYER_VALUES[index];
					self.first_show(self.view.start, new_layer, self.name);
				}
			});
			minus.click(function(){
				var index = self.get_index_of_layer();
				index--;
				if(0 <= index){
					var new_layer = self.LAYER_VALUES[index];
					self.first_show(self.view.start, new_layer, self.name);
				}
			});
		
		},

		/*
		  入力された値のところから始まるよう描写します。
		 */
		_event_enter_input_view_start: function(){
			var self = this;
			var node = $("#input_view_start");
			node.keydown(function(event){
				if(event.keyCode === 13){
					var start = parseInt($(this).val());
					if (start){
						self.first_show(start, self.layer, self.name);
						return false;
					}
					else{
						alert("不適切な入力です。");
						return false;
					}
				}
			});
		},

		/*
		  スクロールは他のイベントよりも複雑なのでこちらで計算させます。
		  (1)マウスのドラッグイベント発生
		  (2)マウスのx座標の差をとりながら、画面を変化させる
		  (3)ドラッグが終わったらイベント終了

		  画面からoutした場合はイベントが続いているところに多少問題あります。
		 */
		_event_scroll_show_images: function(){
			var self = this;

			/* flagがtreuのときがドラッグイベント中です。 */
			var flag = false;

			//上下に動く必要はありませんのでxのみです。
			var start_x;

			$("#show_images").mousedown(function(event){
				//初期化
				flag = true;
				start_x = event.clientX;
				return false;
			});

			$("#show_images").mousemove(function(event){
				var offset_x;
				var WIGHT = self.SCROLL_WIGHT;

				if(flag){
					offset_x = WIGHT * (event.clientX - start_x);
					offset_x *= self.layer;
					//start_x = event.clientX;
					var co = self.get_current_offset();
					self.slide_with_offset(co - offset_x);
					self.view.start -= offset_x;
					start_x = event.clientX;
					self.update();
					console.log("offset " + offset_x);
				}
				return false;

			});

			$("#show_images")
				.mouseup(function(){
					flag = false;
					self.update();
				})
				.mouseout(function(){
					/*
					  firefoxの場合
					  切り返しなどができなくなりますので、
					  flagにfalseを設定しません。
					*/
					//flag = false;
					self.update();
				});
		},

		/*
		  overviewのイベント
		  クリックのみの場合
		  その位置をスタートに変更する

		  ドラッグの場合
		  スタートの位置は常に左側から
		  ドラッグの大きさと縮小拡大は対応させます。

		  実際の計算式
		  IMAGE_WIDTH : 30M = offsetX : view.start

		 */
		_event_overview: function(){

			var self = this;
			/*
			  mousedownイベント開始
			 */
			var flag = false;
			var start_x;
			var node = $("#overview").children(".box");

			/*
			  画像の幅からDNA配列へのサイズ変換です。
			 */
			function get_changedsize(value){
				//開発中は画像の一部だけなので重み付けしています。
				return (MAX_LENGTH * value * 0.0001) / IMAGE_WIDTH;
				//return (MAX_LENGTH * value ) / IMAGE_WIDTH;
			}

			/*
			  value以下の中で最大をとるものを返します。
              当てはまるものがない場合は最後のzoom値を返します。
			  最小値は100です。
			*/
			function get_value_near_zoom(value){
				var MIN_LAYER = self.MIN_LAYER;
				var option_values = new Array();
				var children = $("#controller_select").children();

				//各optionの値を取り出します。
				for(var i = 0; i < children.length; i++){
					var v = parseInt(children.eq(i).val());
					option_values.push(v);
				}
				var prevalue = MIN_LAYER;
				for(var i = 0; i < option_values.length; i++){
					if(option_values[i] > value){
						return prevalue;
					}
					prevalue = option_values[i];

				}
				return prevalue;
			}

			/*
			  ドラッグイベント
			  ドラッグした大きさに合わせて画像を描写します。
			  クリックイベントと排他的にならないといけません。
			*/
			node.mousedown(function(event){
				//イベントの初期化
				flag = true;
				start_x = event.offsetX;
				$(this).clearCanvas();
				return false;
			});

			//ドラッグ中、正方形を描写するだけです。
			node.mousemove(function(event){
				if(flag){
					var offset_x = (event.offsetX - start_x);

					//todo: 二色の長方形を描写するようにします。
					var r = {
						fillStyle: "pink",
						x: start_x, y:0,
						width: offset_x,
						height:200,
						fromCenter: false,
					}
					$(this).clearCanvas();
					$(this).drawRect(r);
				}
			});

			/*
			  どこに移動するかの最終的な決定はこちらで行います。
			  offsetが0の場合はクリックと見なします。
			 */
			node.mouseup(function(event){
				var offset = event.offsetX - start_x;
				if(offset === 0){
					var start = get_changedsize(event.offsetX);
					self.first_show(start, self.layer, self.name);
				}
				else{
					var zoom = get_changedsize(offset);
					var layer = get_value_near_zoom(zoom);
					var min = Math.min(start_x, event.offsetX);
					var start = get_changedsize(min);
					self.first_show(start, layer, self.name);
				}
				//$(this).clearCanvas();
				flag = false;
			});

		},

		/*
		  regionのイベント
		  overviewと同じような動きです。
		  ただし、表示するのはImageListのpointにします。
		 */
		_event_region: function(){

		},

		//init
		_init_set_options: function(){
			var layers = this.LAYER_VALUES;
			for(var i = 0 ; i < layers.length; i++){
				var n = $("#controller_select").append("<option />");
				n = n.children(":last");
				n.attr("value", layers[i]);
				//to do 表示の仕方を変更する1000 => 1k
				n.text("show " + layers[i] + "p");
			}
		},

	};


	//private methods for utility

	//サーバーからのデータ変換
	function _string2json(data){
		return eval("(" + data + ")");
	};

	//cssの値でpxの場合、とって数値にする
	//"100px"(文字列) => 100(数値)
	function _px2int(str){
		return parseInt(str.replace("px" ,""))
	};

	//グローバル空間に登録する
	window.genome = genome;

}(window));


//init
window.onload = function(){
	setInterval(_DEBUG, 1000);
	//モジュールを呼び出す
	//start layer nameを指定
	_genome = new genome(1501, 100, ["sample", "sample"]);

	//test code

	//overviewのメモリを描写します。

	//MAX_LANGTHは計算しやすいようになっていますので、1Mなどの倍数に変換する必要あります。
	$("#overview_scale").attr("width", IMAGE_WIDTH);
	$("#overview_scale").attr("height", 50);
	$("canvas").attr("width", IMAGE_WIDTH);
	$("canvas").attr("height", 50);
	$("canvas.box").css("top", "-50px")
	var color = "#000";
	var ctx = $("#overview_scale");
	var ONE_MEGA = 1000000;
	var r = {
		fillStyle: color,
		x: 0, y: 24,
		width: 800,
		height: 2,
		fromCenter: false
	}
	ctx.drawRect(r);

	var vertical_line = {
		fillStyle: color,
		x: 0, y: 23,
		width: 0.5,
		height: 4,
		fromCenter: false,
	}

	//0.1Mずつ縦線を描写します。
	//解像度の関係で正確なメモリは刻めません。
	var interval = (IMAGE_WIDTH * ONE_MEGA * 0.1) / MAX_LENGTH;
	for(var x = 0; x <= IMAGE_WIDTH; x += interval){
		vertical_line.x = x;
		ctx.drawRect(vertical_line);
	}

	//1Mずつ太い線を描写します。
	vertical_line.y -= 1;
	vertical_line.height += 2;
	vertical_line.width = 1;
	interval = (IMAGE_WIDTH * ONE_MEGA) / MAX_LENGTH;
	//同時にメモリの描写もします。
	var num = 0;
	var text = {
		fillStyle: color,
		strokeStyle: color,
		strokeWidth:0.2,
		x: 0, y: 20,
		font: "9px Arial",
		text: ""
	}
	for(var x = 0, i = 0; x <= IMAGE_WIDTH; x += interval, i++){
		vertical_line.x = x;
		ctx.drawRect(vertical_line);
		text.text = i + "M";
		text.x = i * interval;
		ctx.drawText(text);
	}

};

