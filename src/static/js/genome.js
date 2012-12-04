//global settings
var _genome;

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
			/* 偶数条件付きです。 */
			this.layer;
			this.name;
			this.imagelists;

			//ImageListクラスを扱うstaticな変数にする?
			//this.imagelist;

			//イベントでメソッドを呼ぶのに必要
			var self = this;

			//select表示
			_set_init_option(layer);

			//event登録
			$("#controller_button_left").click(function(){
				self._update_click_button(this, -1)
			});
			$("#controller_button_right").click(function(){
				self._update_click_button(this, +1)
			});

			$("#controller_select").change(function(){
				self._update_click_select(this);
			});

			$("#input_view_start").keydown(function(event){
				return self._enter_input_view_start(this, event);
			});

			this._scroll_show_images();

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
		get_image_start: function(start, layer){
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

		/*
		  表示している画像をoffsetの差だけずらします。
		  offsetはpoint.startとの差になっています。

		 todo: viewはここで書き換えます。
		 */
		slide_with_offset: function(offset){
			var n, left;
			n = $("#show_images img");
			//ずらす前に初期値０に設定します。
			n.css("left", 0);
			left = _px2int(n.eq(0).css("left"));
			left -= offset * this.get_width_per_dna();
			n.css("left", left);
		},
		get_current_offset: function(){
			return this.view.start - this.imagelists[0].point.start;
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

			if(name.length === 0){
				alert("何も選択されていません。");
				return;
			}
			/*
			  残像が残る可能性があります。
			  一度imgの属性srcを削除します。
			 */
			$("#show_images img").removeAttr("src");

			/*
			  画像の開始が1234のような中途半端な値の場合にも
			  対応できるようにします。
			*/
			var _start = this.get_image_start(start, layer);
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

			var update_point = this.imagelists[0].get_update_point();

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
		  スクロールの大きさはlayerの半分

		  _scroll_show_imagesと機能がかぶっているのでまとめる
		*/
		_update_click_button: function (self, left_or_right){
			var n, left;
			n = $("#show_images img");
			left = _px2int(n.css("left"));
			var scroll_size = (this.layer * left_or_right) / 5;
			left -= scroll_size * this.get_width_per_dna();
			this.view.start += scroll_size;
			n.css("left", left)
			this.update()
		},

		/*
		  現在のstartとnameのままでlayerだけ変更します。
		  中央を表示するために
		  スタートの位置をview.startとview.stopの真ん中にします。

		  1501 ~ 1600のとき、1000に縮小する場合
		  1551が中央値になります。
		  よって
		  1051 ~ 2050までを表示します。

		  拡大する場合は上記を下からたどっていきます。
		  結局同じになります。
		*/
		_update_click_select: function(self){
			var new_layer, mediam, start;
			new_layer = parseInt($(self).children(":selected").val());
			//計算を簡略化するために、layerは偶数という条件がつきます。
			mediam = this.view.start + (this.layer / 2);
			start = mediam - (new_layer / 2);
			this.first_show(start, new_layer, this.name);
		},

		_enter_input_view_start: function(self,event){
			if(event.keyCode === 13){
				var start = parseInt($(self).val());
				if (start){
					this.first_show(start, this.layer, this.name);
					return false;
				}
				else{
					alert("不適切な入力です。");
					return false;
				}
			}
		},
		/*
		  スクロールは他のイベントよりも複雑なのでこちらで計算させます。
		 */
		_scroll_show_images: function(){

			var self = this;
			/*
			  flagがtreuのときがドラッグイベント中です。
			 */
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
				//スクロールに対して、移動の微調整をする変数です。
				var WIGHT = 0.1;

				if(flag){
					offset_x = WIGHT * (event.clientX - start_x);
					//start_x = event.clientX;
					var co = self.get_current_offset();
					self.slide_with_offset(co - offset_x);
					self.view.start -= offset_x;
					start_x = event.clientX;
					self.update();
					console.log("on");
				}
				return false;

			});

			$("#show_images")
				.mouseup(function(){
					flag = false;
					self.update();
				})
				.mouseout(function(){
					//flag = false;
					self.update();
				});
		}
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


	//init

	//selectの初期設定をする
	function _set_init_option(layer){

		var layers = [
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

		for(var i = 0 ; i < layers.length; i++){
			var n = $("#controller_select").append("<option />");
			n = n.children(":last");
			n.attr("value", layers[i]);
			//to do 表示の仕方を変更する1000 => 1k
			n.text("show " + layers[i] + "p");
		}
		//layerの初期値を選択させておきます。
		$("#controller_select").val(layer);
	}

	//グローバル空間に登録する
	window.genome = genome;

}(window));


//init
window.onload = function(){
	setInterval(_DEBUG, 1000);
	//モジュールを呼び出す
	//start layer nameを指定
	_genome = new genome(1501, 100, ["sample"]);
};
