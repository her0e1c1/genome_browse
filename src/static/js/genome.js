//global settings
var HOST = "http://localhost:5000"


function _DEBUG(){
	var txt;
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
		this.init()
	};

	//public methods
	genome.prototype = {
		init: function(){
			//初期化する
			//public variable
			this.view = new Array([0,0]);  // 表示する位置 (x, y)で表示
			this.point = new Array([0,0]);  // 画像データの位置 (x, y)で表示
			this.URL = window.document.URL;

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

	//グローバル空間に登録する
	window.genome = genome;

}(window));


//init
window.onload = function(){
	setInterval(_DEBUG, 1)
	//モジュールを呼び出す
	var g = new genome();

	//debug code
	$("#show_images").append("<img />");
	$("img").attr("src","/static/images/sample.png")
	
}
