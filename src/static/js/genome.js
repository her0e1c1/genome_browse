//global settings
var GENOME;


function _DEBUG(){
	var txt = "";
	left = $("#show_images").position().left;
	txt += "; left:" + left;
	txt += "; view.start:" + GENOME.get_view().start;
	txt += "; view.stop:" + GENOME.get_view().stop;

	$("#debug").text(txt);
}


/*
 genomeモジュールはjqueryに依存しています。
 クライアントの仕事
 staticにある画像を表示する
 */
(function(window){

	//private class
	/*
	  取得した画像を格納する配列
	  必ず隣同士が連番な鎖状のデータ構造

	  キャッシュの役割も担っています。
	 */
	var images = new Array();

	/*
	  imagesで表示できる配列の範囲データをもつ
	 */
	var point = {
		start:0,
		stop:0
	};

	Image = function(start, layer, src){
		//private 変数
		//これらの値は書き換えてはなりません。
		this.start = start;
		this.layer = layer;
		this.src = src;
		this.stop = start + layer - 1;
	};
	Image.prototype = {

	};

	//Imageクラスを扱う関数
	function _add_image(image){
		var start = image.start;
		var stop = image.stop;
		//初期状態
		if(images.length === 0){
			point.start = start;
			point.stop = stop;
		}
		else if(point.start - 1 === stop){
			images.unshift(image);
			point.start = start;
		}
		else if(point.stop + 1 === start){
			images.push(image);
			point.stop = stop;
		}
	};

	var genome = function(){
		this.init.apply(this, arguments)
	};

	//private 変数
	// 表示される配列の開始位置
	var view = {
		start: 0, 
		stop: 0,
	};
	var layer = 100;
	var path = {images: "/static/images/"};

	//定数

	/*
	 一枚あたりの画像の幅
	 画像の幅はGBrowseで生成していくときに決定しますので
	 この値は変更できません。
	*/
	var IMAGE_WIDTH = 800;


	//public methods
	genome.prototype = {
		init: function(){

			//select表示
			_set_init_option()

			//imgの枚数を設定
			_set_init_img()

			//event登録
			$("#controller_button_left").click(function(){
				_update_click_button(-1)
			});
			$("#controller_button_right").click(function(){
				_update_click_button(+1)
			});

			//test_code
			view.start = 1401;
			this.get_image(view.start + layer, layer, "sample");
			this.get_image(view.start, layer, "sample");

		},

		//viewの終わりは、view.startとlayerから算出します。
		get_view : function(){
			view.stop = view.start + layer - 1;
			return view
		},
		get_layer: function(){
			return layer;
		},

		/*
		  画像を取得する場合
		  取得するパスは
		  /static/images/name/layer/start.png
		  のようになっています。
		 */
		get_image: function (start, layer, name){

			if(layer === undefined){
				layer = $("#controller_select :selected").val();
			}

			start = start + ".png";
			var src = _join(_join(path.images, name), layer);
			src = src + start;
			console.log("image path: " + src);
			n =$("#show_images");
			if(start > view.start){
				n.append("<img />");
				n.children(":last").attr("src", src);
			}
			else{
				n.prepend("<img />");
				n.children(":first").attr("src", src);

				//取得後にクラスへの登録もする
				var i = new Image(start, layer, name);
				_add_image(i);
			}
		},
	};

	//private methods
	//サーバーからのデータ変換
	function _string2json(data){
		return eval("(" + data + ")");

	};

	//パスをつなげる
	function _join(root, path){
		return root + path + "/";
	}


	/*
	  left_or_right
	  -1の場合　左へ更新
	  +1の場合　右へ更新
	  スクロールの大きさはlayerの半分
	*/
	function _update_click_button(left_or_right, mode){
		var n, left;
		n = $("#show_images img");
		left = _px2int(n.css("left"));
		var scroll_size = (layer * left_or_right) / 5;
		left += scroll_size * _change();
		view.start -= scroll_size;
		n.css("left", left)
	};


	//cssの値でpxの場合、とって数値にする
	//"100px"(文字列) => 100(数値)
	function _px2int(str){
		return parseInt(str.replace("px" ,""))
	};

	//画像の張り合わせる枚数を予め作成する
	function _set_init_img(number){

		for(var i = 0; i < number; i++){
			var n = $("show_images").append("<img />");
		}
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
	setInterval(_DEBUG, 1);
	//モジュールを呼び出す
	GENOME = new genome();
}
