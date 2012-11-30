//global settings
var HOST = "http://localhost:5000"
var GENOME; 

function _DEBUG(){
	var txt = "";
	left = $("#show_images").position().left;
	txt += "; left:" + left;

	$("#debug").text(txt);
}


//genomeモジュール作成
//jqueryに依存
(function(window){

/*
 *クライアントの仕事
 *サーバーに現在の状態を伝える
 *得られた画像を表示する
 */
	var genome = function(){
		this.init.apply(this, arguments)
	};

	//public methods
	genome.prototype = {
		init: function(){
			//初期化する
			//public variable
			this.view = new Array([0,0]);  // 表示する位置 (x, y)で表示
			this.point = new Array([0,0]);  // 画像データの位置 (x, y)で表示
			this.URL = window.document.URL;

			//event 登録
			$("#controller_button_left").click(function(){
				_update(-1)
			});
			$("#controller_button_right").click(function(){
				_update(+1)
			});

		},
		test: function(){
			//alert("this is a test");
		},
		get_image: function (start, stop){
			//サーバーから画像をajaxでリクエストする
			data = {
				start: start,
				stop: stop,
			}
			return $.get(this.URL + "/get_image", data)
		},
	}

	//private methods
	//サーバーからのデータ変換
	function _string2json(data){
		return eval("(" + data + ")");
	};

	/*
	  left_or_right
	  -1の場合　左へ更新
	  +1の場合　右へ更新
	*/
	function _update(left_or_right, mode){
		var n, left;
		n = $("#show_images img");
		left = _px2int(n.css("left"));
		left += 10 * left_or_right;
		n.css("left", left)
	}

	//cssの値でpxの場合、とって数値にする
	//"100px"(文字列) => 100(数値)
	function _px2int(str){
		return parseInt(str.replace("px" ,""))
	}

	//グローバル空間に登録する
	window.genome = genome;

}(window));


//init
window.onload = function(){
	setInterval(_DEBUG, 1)
	//モジュールを呼び出す
	$("#show_images").append("<img />");
	$("img").attr("src","/static/images/sample.png")
	$("#show_images").append("<img />");
	$("img").eq(1).attr("src","/static/images/sample1.png")
	$("#show_images").prepend("<img />");
	$("img").eq(0).attr("src","/static/images/sample2.png")
	GENOME = new genome();

}
