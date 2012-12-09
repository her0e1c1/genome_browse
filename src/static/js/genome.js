//global settings
var _Genome;
var Utility = new Utility();

/*
スクロールの注意
右にスクロールする場合は
ゲノムの配列の番号の小さい方を表示するので逆に動きます。
*/

/*
Gemone Browserの各種設定です。
ユーザーやサーバーから変更がない限りは変更できない定数です。
また、変換などのユーティリティも加えてます。
*/
GlobalSettings = function(){
	this.init.apply(this, arguments);
};

GlobalSettings.prototype = {
	init: function(){

		this.URL = document.URL;
		/*
		  一枚あたりの画像の幅
		  画像の幅はGBrowseで生成していくときに決定しますので
		  この値は変更できません。
		*/
		this.IMAGE_WIDTH = 800;
		this.IMAGE_HEIGHT = 100;

		//計算しやすい様に奇数です。
		this.IMAGE_NUMBER = 5;

		//リージョンに表示する範囲です(layer * 数値)
		this.REGION_NUMBER = 9;

		this.PATH = {images: "/static/images/"};

		// スクロールに対して、移動の微調整をする変数です。
		// 画像をスクロールした場合
		this.SCROLL_WIGHT = 0.001;

		//overviewをスクロールした場合
		//this.SCROLL_OVERVIEW = -0.01;

		//サーバーから必要なゲノム情報
		this.START = 1;
		this.MAX_LENGTH = 30000001; //30M
		//this.MAX_LENGTH = 3722;
		//表示用に切りがいい数値に変換します。
		this.ROUND_MAX_LENGTH = Utility.roundout(this.MAX_LENGTH);

		//select>optionの値です。
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

		//取得するデータ名
		this.TRACK_NAME = ["sample", "sample"];

		//css関連
		this.OVERVIEW_HEIGHT = 50;
	},

	/*
	  最大でとることのできるstartの値を返します。
	  layerの値によります。

	  最長が100でlayerが10のときは
	  取りうるstartは91です。
	*/
	get_max_start: function(layer){
		return (this.MAX_LENGTH - layer + 1);
	},

	/*
	  画像の幅とDNAの配列の幅は異なります。
	  スクロールなどの処理をしても、ずれないようにします。
	*/
	get_width_per_dna: function(layer){
		return this.IMAGE_WIDTH / layer ;
	},

	/*
	  基準点startと、実際のDNA配列の位置xと、表示する全体幅DNAlength
	  を引き数にします。
	  返すのは、画像幅に置き換えたxの位置です。
	  計算式
	  画像の開始位置 : IMAGE_WIDTH =
	  (DNAの位置 - NDAstart) : 表示する全体の長さ
	 */
	change_dna2image: function(x, start, length){
		return (this.IMAGE_WIDTH / length) * (x - start);
	},

	change_image2dna: function(w, start, length){
		return start + (w * length) / this.IMAGE_WIDTH;
	},

	/*
	  切り上げたDNAの長さから画像の幅に変換します。
	*/
	change_rounddna2image: function(dna){
		return (this.IMAGE_WIDTH * dna) / this.ROUND_MAX_LENGTH;
	},

	/*
	  画像の幅からDNA配列へのサイズ変換です。
	*/
	change_image2rounddna: function(width){
		return (this.ROUND_MAX_LENGTH * width) / this.IMAGE_WIDTH;
	},

	//layerの値と一致した番号を返します。
	get_index_of_layer: function(layer){
		for(var i = 0; i < this.LAYER_VALUES.length; i++){
			if(layer === this.LAYER_VALUES[i]){
				return i;
			}
		}
		throw "layerが不適切な値です。";
	},

	/*
	  LAYERの値のうち、value以下の中で最大をとるものを返します。
      当てはまるものがない場合は最後のzoom値を返します。
	  最小値は100です。
	*/
	get_value_near_zoom: function(value){
		var MIN_LAYER = this.MIN_LAYER;
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
	},

	/* 1000を1kのように読みやすい数値に変換します。*/
	change_layervalue4show: function(){

	},
	
};

var GS = new GlobalSettings();

function _DEBUG(){

	var txt = "";
	left = $("#show_images").position().left;
	txt += "; view.start:" + _Genome.get_view().start;
	txt += "; view.stop:" + _Genome.get_view().stop;
	txt += ";<br /> update_point.start:" + _Genome.get_imagelist().get_update_point().start;
	txt += "; update_point.stop:" + _Genome.get_imagelist().get_update_point().stop;
	txt += "; <br />point.start:" + _Genome.get_imagelist().point.start;
	txt += "; point.stop:" + _Genome.get_imagelist().point.stop;

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
	this.src = Utility.make_src_path(start, layer, name, GS.PATH.images)
	this.stop = start + layer - 1;
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
		this.images = new Array(GS.IMAGE_NUMBER);
		this.point = Utility.get_side_point(start, layer, GS.IMAGE_NUMBER);
		//画像データを生成する
		for(var i = 0; i < GS.IMAGE_NUMBER; i++){
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
			stop: this.images[GS.IMAGE_NUMBER - 1].start,
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

};

Box = function(){
	this.init.apply(this, arguments);
};

Box.prototype = {
	/*
	  rectのx, widthに関しては、配列の始めと含む配列のサイズです。
	  全データの始めと終わりを決めることで描くboxの大きさが決まります。
	 */
	init: function(node, rect, start, stop){
		this.node = node;
		this.start = start;
		this.stop = stop;
		this.length = stop - start + 1;
		this.fillStyle = rect.fillStyle,
		this.y = rect.y;
		this.rect_x = rect.x;
		this.rect_width = rect.width;
		this.height = rect.height;
		//先にxから計算させます。
		this.set_x(rect.x);
		this.set_width(rect.width);
	},

	_change: function(x){
		return GS.change_dna2image(x, this.start, this.length);
	},
	draw: function(){
		this.clear();
		if(this.width < 1)
			this.width = 5;
		this.node.drawRect(this._to_json());
	},
	set_x :function(x){
		this.rect_x = x;
		this.x = this._change(x);
	},

	set_width :function(w){
		this.rect_width = w;
		this.width = this._change(w + this.rect_x) - this.x;
	},

	clear: function(){
		this.node.clearCanvas();
	},
	_to_json: function(){
		var j = {
			fillStyle: this.fillStyle,
			x: this.x, y: this.y,
			width: this.width,
			height: this.height,
			fromCenter: false
		}
		return j;
	},

	/*
	  xが領域内であればtrueを返します。
	  xはDNAの位置を画像の幅に変更したものがきます。
	*/
	is_inside: function(x){
		var r = false;
		if(this.x <= x &&
		   this.x + this.width >= x)
			r = true;
		return r;
	},

};






/*
 genomeモジュールはjqueryとjcanvasに依存しています。
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
			this.overview_box;
			this.region_box ;

			//htmlの初期化
			this._init_html();
			this._init_set_options();
			
			//overview
			this._init_overview();

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

		/*
		  倍率を変更する際に真ん中を表示する必要があります。
		  その場合の新たな開始位置を取得します。
		 */
		get_start_after_zoom:function(old_start, old_layer, new_layer){
			//計算を簡略化するために、layerは偶数という条件がつきます。
			var mediam = old_start + (old_layer / 2);
			var start = mediam - (new_layer / 2);

			return start;
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
				left = Utility.px2int(node.eq(0).css("left"));
			}
			else{
				throw mode + "は不適切な値です。";
			}

			this.view.start += offset;
			left -= offset * GS.get_width_per_dna(this.layer);
			node.css("left", left);
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
			//未設定の場合の初期値を設定します。
			if(name.length === 0){
				alert("何も選択されていません。");
				return;
			}

			if(start === undefined ||
			   start <= 0 ){
				start = 1;
			}

			//最大を超えていたら最大に設定します。
			var max = GS.get_max_start(layer);
			if(start > max){
				start = max;
			}
			
			var stop = this.get_view_stop(start);

			if(layer === undefined){
				this.layer = GS.MIN_LAYER;
			}
			//layerの初期値を選択させておきます。
			$("#controller_select").val(layer);

			this.view ={
				start: start,
				stop: stop,
			};
			this.layer = layer;
			this.name = name;
			this.imagelists = new Array();

			//overview boxを描写します。
			var rect = {
				fillStyle: "pink",
				x: start, y:0,
				width: layer,
				height:200,
				fromCenter: false,
			}
			var node = $("#overview > canvas.box");
			this.overview_box = new Box(node, rect, GS.START , GS.ROUND_MAX_LENGTH);
			this.overview_box.draw();

			/*
			  regionの初期化をします。
			*/
			this._update_region(start , layer, GS.REGION_NUMBER);



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
			var len = this.imagelists.length;
			//子供の要素を一度中身をリセットします。
			n.empty();
			n.css("height", GS.IMAGE_HEIGHT * len);
			n.css("width", GS.IMAGE_WIDTH * GS.IMAGE_NUMBER);
			for(var j = 0; j < len; j++){
				n.append("<div></div>");
				var child = n.children(":last");
				for(var i = 0; i < GS.IMAGE_NUMBER; i++){
					child.append("<img />");
					var grand_child = child.children(":last");
					grand_child.attr("src", this.imagelists[j].images[i].src);
					grand_child.css("height", GS.IMAGE_HEIGHT);
					grand_child.css("width", GS.IMAGE_WIDTH);

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
		  条件に当てはった場合は更新します。

		  ここでは既に次ぎに描写するstartやlayerが予め決まっています。

		  todo: 最大長または１までしか表示できないようにします。
		 */
		update: function(){
			var update_point = this.get_update_point();
			
			if(this.view.start <= 0 ){
				this.view.start = 1;
			}
			//最大を超えていたら最大に設定します。
			var max = GS.get_max_start(this.layer);
			if(this.view.start > max){
				this.view.start = max;
			}
			
			//htmlの描画
			this._update_overview();
			this._update_region(this.view.start, this.layer, 9);
			/*
			  条件に合致したらimagelistを書き換えます。
			  (IMAGE_NUMBER) - 1 / 2回
			  IMAGE_NUMBERが奇数である条件が効いています。
			*/
			var left_or_right;
			if(update_point.start > this.view.start){
				left_or_right = +1;
			}
			else if(update_point.stop < this.get_view().stop){
				left_or_right = -1;
			}
			else{
				/*
				  条件に当てはまらない場合は
				  画像をずらすだけです。
				  つまり、画像の書き換えはしませんが、
				  表示するデータの変更はします。
				*/
				//show_info()だけでよい
				this.show_info();
				return;
			}
			for(var j = 0; j < this.imagelists.length; j++){
				for(var i = 0; i < (GS.IMAGE_NUMBER - 1) / 2; i++ ){
					this.imagelists[j].update(left_or_right);
				}
			}
			this.show();
		},

		_update_overview: function(){
			var node = $("#overview > canvas.box");
			this.overview_box.set_x(this.view.start);
			this.overview_box.set_width(this.layer);
			this.overview_box.draw();
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
				var index = GS.get_index_of_layer(self.layer);
				index++;
				if(GS.LAYER_VALUES.length > index){
					var new_layer = GS.LAYER_VALUES[index];
					var start = self.get_start_after_zoom(
						self.view.start,
						self.layer,
						new_layer
					);
					self.first_show(start, new_layer, self.name);
				}
			});
			minus.click(function(){
				var index = GS.get_index_of_layer(self.layer);
				index--;
				if(0 <= index){
					var new_layer = GS.LAYER_VALUES[index];
					var start = self.get_start_after_zoom(
						self.view.start,
						self.layer,
						new_layer
					);
					self.first_show(start, new_layer, self.name);
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
				var WIGHT = GS.SCROLL_WIGHT;

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
			var node = $("#overview > canvas.box");

			/*
			  boxをクリックした場合は
			  boxごと動かすドラッグイベントを発生させます。
			 */
			var flag_drag = false;

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

				if(self.overview_box.is_inside(event.offsetX))
					flag_drag = true;
			});

			//ドラッグ中、正方形を描写するだけです。
			node.mousemove(function(event){
				if(flag){
					if (flag_drag){
						var start =GS.change_image2rounddna(event.offsetX);
						//boxの真ん中を動くようにします。
						start -= self.layer / 2;
						self.first_show(start, self.layer, self.name);
					}
					else{
						var offset_x = (event.offsetX - start_x);
						//todo: 二色の長方形を描写するようにします。
						self.overview_box.clear();
						self.overview_box.x = start_x;
						self.overview_box.width = offset_x;
						self.overview_box.draw();
					}
				}
			});

			/*
			  どこに移動するかの最終的な決定はこちらで行います。
			  offsetが0の場合はクリックと見なします。
			 */
			node.mouseup(function(event){
				var offset = event.offsetX - start_x;
				if(flag_drag){
					self.update();
				}
				else{
					if(offset === 0){
						var start = GS.change_image2rounddna(event.offsetX);
						self.first_show(start, self.layer, self.name);
					}
					else{
						var zoom = GS.change_image2rounddna(offset);
						var layer = GS.get_value_near_zoom(zoom);
						var min = Math.min(start_x, event.offsetX);
						var start = GS.change_image2rounddna(min);
						self.first_show(start, layer, self.name);
					}
				}
				flag = false;
				flag_drag = false;
			});

		},

		/*
		  regionのイベント
		  overviewと同じような動きです。
		  ただし、表示するのはImageListのpointにします。
		 */
		_event_region: function(){
			var self = this;
			/*
			  mousedownイベント開始
			 */
			var flag = false;
			var start_x;
			var node = $("#region  canvas.box");
			var bothends;
			var length;

			/*
			  BOXをクリックした場合は
			  boxごと動かすドラッグイベントを発生させます。
			 */
			var flag_drag = false;

			node.mousedown(function(event){
				//イベントの初期化
				flag = true;
				start_x = event.offsetX;
				$(this).clearCanvas();
				bothends = Utility.get_side_point(
					self.view.start,
					self.layer,
					GS.REGION_NUMBER);
				length = bothends.stop - bothends.start + 1;

				if(self.region_box.is_inside(event.offsetX))
					flag_drag = true;
			});

			//ドラッグ中、正方形を描写するだけです。
			node.mousemove(function(event){
				if(flag){
					if (flag_drag){
						/* ドラッグは背景を動かさないといけない */
						var start =GS.change_image2dna(
							event.offsetX,
							bothends.start,
							length);
						//boxの真ん中を動くようにします。
						start -= self.layer / 2;
						self.first_show(start, self.layer, self.name);
					}
					else{
						var offset_x = (event.offsetX - start_x);
						//todo: 二色の長方形を描写するようにします。
						//表示するだけなのでDNA配列の情報は無視します。
						self.region_box.x = start_x;
						self.region_box.width = offset_x;
						self.region_box.draw();
					}
				}
			});

			node.mouseup(function(event){
				var offset = event.offsetX - start_x;
				if(flag_drag){
					self.update();
				}
				else{
					if(offset === 0){
						var start = GS.change_image2dna(
							event.offsetX,
							bothends.start,
							length);
						self.first_show(start, self.layer, self.name);
					}
					else{
						var x1 = GS.change_image2dna(
							event.offsetX,
							bothends.start,
							length);
							
						var x2 = GS.change_image2dna(
							start_x,
							bothends.start,
							length);
							
						var zoom = x1 - x2;
						if(zoom < 0)
							zoom = -zoom;

						var layer = GS.get_value_near_zoom(zoom);
						var min = Math.min(start_x, event.offsetX);
						var start =  GS.change_image2dna(
							min,
							bothends.start,
							length);
						self.first_show(start, layer, self.name);
					}
				}
				flag = false;
				flag_drag = false;
			});

		},


		//init

		_init_html: function(){
			$("#wrap_show_images").css("width", GS.IMAGE_WIDTH);
		},

		_init_set_options: function(){
			var layers = GS.LAYER_VALUES;
			for(var i = 0 ; i < layers.length; i++){
				var n = $("#controller_select").append("<option />");
				n = n.children(":last");
				n.attr("value", layers[i]);
				//to do 表示の仕方を変更する1000 => 1k
				n.text("show " + layers[i] + "p");
			}
		},

		/*
		  
		*/
		_init_overview: function(){
			$("#overview_scale").attr("width", GS.IMAGE_WIDTH);
			$("#overview_scale").attr("height", GS.OVERVIEW_HEIGHT);
			$("canvas").attr("width", GS.IMAGE_WIDTH);
			$("canvas").attr("height", GS.OVERVIEW_HEIGHT);
			$("canvas.box").css("top", (- GS.OVERVIEW_HEIGHT) + "px");
			var color = "#000";
			var ctx = $("#overview_scale");

			var vertical_line = {
				fillStyle: color,
				x: 0, y: 23,
				width: 0.5,
				height: 4,
				fromCenter: false,
			}

			var interval = Utility.get_interval(GS.ROUND_MAX_LENGTH);

			//1%ずつ縦線を表示します。
			for(var i = 0; i < interval.one.length; i++){
				var x = GS.change_rounddna2image(interval.one[i]);
				vertical_line.x = x;
				ctx.drawRect(vertical_line);
			}

			//10%ずつ太い縦線を描写します。
			vertical_line.y -= 1;
			vertical_line.height += 2;
			vertical_line.width = 1;

			//メモリの描写もします。
			var text = {
				fillStyle: color,
				strokeStyle: color,
				strokeWidth:0.2,
				x: 0, y: 20,
				font: "9px Arial",
				text: ""
			}

			 for(var i = 0; i < interval.ten.length; i++){
				 var x = GS.change_rounddna2image(interval.ten[i]);
				 vertical_line.x = x;
				 ctx.drawRect(vertical_line);

				 text.text = interval.ten[i];
				 text.x = x;
				 ctx.drawText(text);
			 }

		},

		/*
		   region
		   layerの何倍を表示するかはsizeで決めます。
		   メモリは割り切れる値を表示させます。

		   viewの値が変わる毎に描写を書き換えていく必要があります。
		*/
		_update_region: function(start ,layer, size){
			var color = "#000";
			var ctx = $("#region_scale");
			var stop = start + layer - 1;

			ctx.clearCanvas();
			var vertical_line = {
				fillStyle: color,
				x: 0, y: 23,
				width: 1,
				height: 4,
				fromCenter: false,
			}
			
			var bothends = Utility.get_side_point(start, layer, size);
			var DNAlength = bothends.stop - bothends.start + 1;
			var interval = Utility.get_interval(DNAlength);

			//最も大きくて、割り切れる、プロットする点
			var last = bothends.stop - (bothends.stop % layer);

			//メモリの描写もします。
			var text = {
				fillStyle: color,
				strokeStyle: color,
				strokeWidth:0.2,
				x: 0, y: 20,
				font: "9px Arial",
				text: ""
			}

			for(var p = last; bothends.start < p; p -= layer){
				var x = GS.change_dna2image(p, bothends.start, DNAlength);
				vertical_line.x = x;
				ctx.drawRect(vertical_line);

				 text.text = p;
				 text.x = x;
				 ctx.drawText(text);
			}

			//メモリをさらに1/10で刻みます。
			last = bothends.stop - (bothends.stop % (layer / 10));

			for(var p = last; bothends.start < p; p -= (layer/ 10)){
				var x = GS.change_dna2image(p, bothends.start, DNAlength);
				vertical_line.x = x;
				ctx.drawRect(vertical_line);
			}
			
			//region boxを描写します。
			var rect = {
				fillStyle: "pink",
				x: start, y:0,
				width: layer,
				height:200,
				fromCenter: false,
			}

			ctx = $("#region > canvas.box");
			this.region_box = new Box(ctx ,rect , bothends.start, bothends.stop);
			this.region_box.draw();

		},

	};

	//グローバル空間に登録します。
	window.genome = genome;

}(window));


//init
window.onload = function(){
	setInterval(_DEBUG, 1000);
	init();
	function init(){
		$.get(GS.URL + "/get_imagepath",{},function(data){
			json = Utility.string2json(data);
			//json.pathにはサーバーに保存された画像パスがあります。
			GS.TRACK_NAME = json.path;

			/* start layer nameを指定します。 */
			_Genome = new genome(1501, 100, GS.TRACK_NAME);

			$("#page_title").text("name" + _Genome.view.start)
		})
	}
};

