//global settings
var _genome;

/*
スクロールの注意
右にスクロールする場合は
ゲノムの配列の番号の小さい方を表示するので
逆に動く
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

	//private 変数
	// 表示される配列の開始位置
	var _view = {
		start: 1501,
		stop: 0,
	};
	var _layer = 100;

	//ImageListクラスを扱うstaticな変数にする
	var imagelist;

	//public methods
	genome.prototype = {
		init: function(start, layer, name, offset){
			//イベントの時に必要
			var self = this;
			//select表示
			_set_init_option();

			//imgの枚数を設定
			_set_init_img();

			//event登録
			$("#controller_button_left").click(function(){
				self._update_click_button(-1)
			});
			$("#controller_button_right").click(function(){
				self._update_click_button(+1)
			});
			//画像
			imagelist = new ImageList(start, layer, name);
			this.show_images();
			this.slide_with_offset(offset);
		},

		//private変数にアクセスするメソッド
		//viewの終わりは、view.startとlayerから算出します。
		get_view : function(){
			_view.stop = _view.start + _layer - 1;
			return _view
		},
		get_layer: function(){
			return layer;
		},
		get_imagelist: function(){
			return imagelist;
		},
		show_images: function(){
			var n = $("#show_images");
			for(var i = 0; i < IMAGE_NUMBER; i++){
				var child = n.children("[value=" + i  + "]");
				child.attr("src", imagelist.images[i].src);
			}
		},
		get_width_per_dna: function(){
			return IMAGE_WIDTH / _layer ;
		},
		/*
		  offsetの差だけずらす
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
				imagelist.add(i);
			}
		},
		//画像の描写を更新するクラス
		update: function(){
			var update_point = imagelist.get_update_point();

			/*
			  条件に合致したらimagelistを書き換えます。
			  (IMAGE_NUMBER) - 1 / 2回
			*/
			var left_or_right;
			if(update_point.start > _view.start){
				left_or_right = +1;
			}
			else if(update_point.stop < _view.stop){
				left_or_right = -1;
			}
			else{
				return;
			}
			for(var i = 0; i < (IMAGE_NUMBER - 1) / 2; i++ ){
				imagelist.update(left_or_right);
			}
			this.show_images();
			$("#show_images img").css("left", 0)
			var offset = _view.start - imagelist.point.start;
			this.slide_with_offset(offset);
			
		},
		/*
		  left_or_right
		  -1の場合　左へ更新
		  +1の場合　右へ更新
		  スクロールの大きさはlayerの半分
		*/
		_update_click_button: function (left_or_right, mode){
			var n, left;
			n = $("#show_images img");
			left = _px2int(n.css("left"));
			var scroll_size = (_layer * left_or_right) / 5;
			left -= scroll_size * this.get_width_per_dna();
			_view.start += scroll_size;
			n.css("left", left)
			this.update()
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


	/*
	   画像データを移動させると
	   実際の画像の表示位置と表示されている画像の位置が違う
	   そこで、スクロールした際の比率を計算する
	*/
	function _change(){
		var a;
		return IMAGE_WIDTH / layer;
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
	_genome = new genome(1501, 100, "sample", 200);
}

