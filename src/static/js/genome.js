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

//計算しやすい様に奇数
var IMAGE_NUMBER = 5;

var PATH = {images: "/static/images/"};

//private class
Image = function(start, layer, name){
	//private 変数
	//これらの値は書き換えてはなりません。
	this.start = start;
	this.layer = layer;
	this.name = name;
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
}

function _DEBUG(){
	var txt = "";
	left = $("#show_images").position().left;
	txt += "; left:" + left;
	txt += "; view.start:" + _genome.get_view().start;
	txt += "; view.stop:" + _genome.get_view().stop;
	txt += "; update_point.start:" + _genome.get_imagelist().get_update_point().start;
	txt += "; update_point.stop:" + _genome.get_imagelist().get_update_point().stop;
	txt += "; point.start:" + _genome.get_imagelist().point.start;
	txt += "; point.stop:" + _genome.get_imagelist().point.stop;

	$("#debug").text(txt);
}


/*
 genomeモジュールはjqueryに依存しています。
 クライアントの仕事
 staticにある画像を表示します。

 クロージャによるクラスやメソッドは、
 他の変数に依存しないようにします。
 */
(function(window){

	var genome = function(){
		this.init.apply(this, arguments);
	};


	//public methods
	genome.prototype = {
		init: function(start, layer, name){

			//public変数
			var stop = this.get_view_stop(start);
			this.view ={
				start: start,
				stop: stop,
			};
			this.layer = layer;
			this.name = name;
			
			//ImageListクラスを扱うstaticな変数にする?
			this.imagelist;

			//イベントでメソッドを呼ぶのに必要
			var self = this;

			//select表示
			_set_init_option();

			//imgの枚数を設定
			_set_init_img();

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

			//画像取得
			var _start = this.get_image_start(start, layer);
			this.imagelist = new ImageList(_start, layer, name);
			this.show_images();

			//startの位置に画像をずらします。
			var offset;
			offset = start - this.imagelist.point.start;
			this.slide_with_offset(offset);
		},

		//private変数にアクセスするメソッド
		//viewの終わりは、view.startとlayerから算出します。
		get_view : function(){
			this.view.stop = this.get_view_stop(this.view.start);
			return this.view;
		},
		get_layer: function(){
			return this.layer;
		},
		get_imagelist: function(){
			return this.imagelist;
		},

		/*
		  imgaelistのデータを全て表示します。
		 */
		show_images: function(){
			var n = $("#show_images");
			for(var i = 0; i < IMAGE_NUMBER; i++){
				var child = n.children("[value=" + i  + "]");
				child.attr("src", this.imagelist.images[i].src);
			}
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
		 */
		get_image_start: function(start, layer){
			if(layer === undefined){
				layer = this.layer;
			}
			var offset = (start % layer) - 1;
			return (start - offset);
		},

		get_view_stop :function(start, layer){
			if(layer === undefined){
				layer = this.layer;
			}
			return start + layer - 1;
		},

		/*
		  表示している画像をoffsetの差だけずらします。
		 */
		slide_with_offset: function(offset){
			var n, left;
			n = $("#show_images img");
			left = _px2int(n.eq(0).css("left"));
			left -= offset * this.get_width_per_dna();
			//_view.start += offset;
			n.css("left", left);
		},
		/*
		  画像を取得する場合
		  取得するパスは
		  /static/images/name/layer/start.png
		  のようになっています。
		 */
		get_image: function (){

			if(layer === undefined){
				layer = $("#controller_select :selected").val();
			}

			//class作成
			var i = new Image(start, layer, name);

			//画像のパスを作成
			start = start + ".png";
			var src = _join(_join(path.images, name), layer);
			src = src + start;
			console.log("image path: " + src);
			var n =$("#show_images");

			//実際にアクセスする
			if(start > view.start){
				n.append("<img />");
				n.children(":last").attr("src", src);
			}
			else{
				n.prepend("<img />");
				n.children(":first").attr("src", src);

				//取得後にクラスへの登録もする
				this.imagelist.add(i);
			}
		},
		//画像の描写を更新するクラス
		update: function(){

			var update_point = this.imagelist.get_update_point();

			/*
			  条件に合致したらimagelistを書き換えます。
			  (IMAGE_NUMBER) - 1 / 2回
			*/
			var left_or_right;
			if(update_point.start > this.view.start){
				left_or_right = +1;
			}
			else if(update_point.stop < this.view.stop){
				left_or_right = -1;
			}
			else{
				return;
			}
			for(var i = 0; i < (IMAGE_NUMBER - 1) / 2; i++ ){
				this.imagelist.update(left_or_right);
			}
			this.show_images();
			$("#show_images img").css("left", 0)
			var offset = this.view.start - this.imagelist.point.start;
			this.slide_with_offset(offset);
			
		},
		/*
		  left_or_right
		  -1の場合　左へ更新
		  +1の場合　右へ更新
		  スクロールの大きさはlayerの半分
		*/
		_update_click_button: function (event, left_or_right){
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
		*/
		_update_click_select: function(event){
			var value;
			value = $(event).children(":selected").val();
			this.init(this.view.start, value, this.name);
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

	//init

	//画像の張り合わせる枚数を予め作成する
	function _set_init_img(){

		for(var i = 0; i < IMAGE_NUMBER; i++){
			var n = $("#show_images").append("<img />");
			n = n.children(":last");
			n.attr("value", i)
		}
	};

	//selectの初期設定をする
	function _set_init_option(){

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
	}

	//グローバル空間に登録する
	window.genome = genome;

}(window));


//init
window.onload = function(){
	setInterval(_DEBUG, 1000);
	//モジュールを呼び出す
	//start layer nameを指定
	_genome = new genome(1521, 100, "sample");
}
