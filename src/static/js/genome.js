
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

		/*
		  サーバーのデータ情報です。
		  はじめの接続の際に設定します。
		*/
		this.datasources;
		this.seq_ids;
		this.tracks;
		this.path;

		//現在設定されている情報です。
		this.c_datasource;
		this.c_seq_id;
		this.c_tracks = [];

		this.URL = document.URL;
		/*
		  一枚あたりの画像の幅
		  画像の幅はGBrowseで生成していくときに決定しますので
		  この値は変更できません。
		*/
		this.IMAGE_WIDTH = 800;

		//計算しやすい様に奇数です。(最低が5です。)
		this.IMAGE_NUMBER = 5;

		//リージョンに表示する範囲です(layer * 数値)
		//計算しやすい様に奇数です。
		this.REGION_NUMBER = 11;

		this.PATH = {images: "/static/images/"};

		// スクロールに対して、移動の微調整をする変数です。
		// 画像をスクロールした場合
		this.SCROLL_WIGHT = 0.001;

		//overviewをスクロールした場合
		//this.SCROLL_REGION = 0.001;

		//サーバーから必要なゲノム情報
		this.START = 1;
		this.MAX_LENGTH = 30000001; //30M
		//this.MAX_LENGTH = 37220;
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
		this.TRACK_NAME;

		//css関連(偶数条件付きです。)
		this.OVERVIEW_HEIGHT = 50;
		this.REGION_HEIGHT = 50;
		this.DETAILS_SCALE_HEIGHT = 50;
		this.RULER_WIDTH = 46;
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
		//小さすぎる場合は、補正します。
		if(0 <= this.width && this.width < 2.5)
			this.width = 2.5;
		else if(-2.5 <= this.width && this.width < 0)
			this.width = -2.5;

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
			this._init_overview();
			this._init_details();
			this._init_ruler();

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

			//最大を超えていたら最大に設定します。
			var max = GS.get_max_start(layer);
			if(start > max){
				start = max;
			}

			/*
			  maxがおかしな値を取る可能性がありますので、
			  こちらが後評価です。

			  todo: 数値でなくて文字列などがきた場合の対応もします。
			*/
			if(start === undefined ||
			   start <= 0 ){
				start = 1;
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
			var node = $("#overview  canvas.box");
			this.overview_box = new Box(node, rect, GS.START , GS.ROUND_MAX_LENGTH);
			this.overview_box.draw();

			/*
			  初期化した後もupdateします。
			*/
			this._update_region(start , layer, GS.REGION_NUMBER);
			this._update_details(start, layer);

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
			this._update_ruler();
		},
		
		/*
		  imgaelistのデータを全て表示します。
		 */
		show_images: function(){
			var n = $("#show_images");
			var len = this.imagelists.length;
			//子供の要素を一度中身をリセットします。
			n.empty();
			n.css("width", GS.IMAGE_WIDTH * GS.IMAGE_NUMBER);
			for(var j = 0; j < len; j++){
				n.append("<div></div>");
				var child = n.children(":last");
				for(var i = 0; i < GS.IMAGE_NUMBER; i++){
					child.append("<img />");
					var grand_child = child.children(":last");
					grand_child.error(default_image)
					grand_child.attr("src", this.imagelists[j].images[i].src);

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

			//cookieの書き換えも行います。
			this.update_cookie();
		},

		/*
		   イベントが起きた後に、必要な箇所を書き換えます。
		 */
		show_info: function(){
			var start = Math.floor(this.view.start)
			$("#input_view_start").val(start);
			
			var st = Math.floor(this.get_view().start);
			var sp = Math.floor(this.get_view().stop);
			var text = GS.c_datasource + " :";
			text += this.layer + " bp from ";
			text += GS.c_seq_id + " :";
			text += st + "..";
			text += sp;
			$("#page_title p").text(text);
		},

		/*
		  update_pointに達していた場合
		  画像の描写を更新します。
		  条件に当てはった場合は更新します。

		  ここでは既に次ぎに描写するstartやlayerが予め決まっています。

		 */
		update: function(){
			var update_point = this.get_update_point();

			//最大を超えていたら最大に設定します。
			var max = GS.get_max_start(this.layer);
			if(this.view.start > max){
				this.view.start = max;
			}
			if(this.view.start <= 0 ){
				this.view.start = 1;
			}

			//htmlの描画
			this._update_overview();
			this._update_region(this.view.start, this.layer, GS.REGION_NUMBER);
			this._update_details(this.view.start, this.layer);
			this._update_ruler();
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
				//show_info()だけです。
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

		/*
		  start, layerのクッキー値を変更します。
		 */
		update_cookie: function(){
			$.cookie("start", this.view.start);
			$.cookie("layer", this.layer);
		},

		_update_overview: function(){
			var node = $("#overview  canvas.box");
			this.overview_box.set_x(this.view.start);
			this.overview_box.set_width(this.layer);
			this.overview_box.draw();
		},

		/*
		  キャンバスは毎回書き換えるので背景だけ別表示はできません。
		 */
		_update_details: function(start, layer){
			var ctx = $("#details_scale");
			var color = "#000";
			var height = 4;
			var y = (GS.DETAILS_SCALE_HEIGHT - height / 2) / 2;

			ctx.clearCanvas();

			this._init_details();
			var vertical_line = {
				fillStyle: color,
				x: 0, y: y,
				width: 1,
				height: height,
				fromCenter: false,
			}

			var sp = start + layer - 1;
			var st = start;
			var layer = this.layer;
			var DNAlength = sp - st + 1;

			//メモリの描写もします。
			var text = {
				fillStyle: color,
				strokeStyle: color,
				strokeWidth:0.2,
				x: 0, y: 20,
				font: "9px Arial",
				text: ""
			}

			last = sp - (st  % (layer / 10)) + 1;
			for(var p = last; st < p; p -= (layer / 10)){
				var x = GS.change_dna2image(p, st, DNAlength);
				vertical_line.x = x;
				ctx.drawRect(vertical_line);

				text.text = p;
				text.x = x;
				ctx.drawText(text);
			}

			last = sp - (st  % (layer / 100)) + 1;
			for(var p = last; st < p; p -= (layer / 100)){
				var x = GS.change_dna2image(p, st, DNAlength);
				vertical_line.x = x;
				ctx.drawRect(vertical_line);
			}
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
			if(scroll_size + this.view.start > 0 &&
			  scroll_size + this.get_view().stop <= GS.MAX_LENGTH){
				this.slide_with_offset(scroll_size, "view");
				this.update();
			}
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

			minus.click(function(){
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
			plus.click(function(){
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
		  (1)マウスのドラッグイベント発生
		  (2)マウスのx座標の差をとりながら、画面を変化させる
		  (3)ドラッグが終わったらイベント終了

		  画面からoutした場合はイベントが続いているところに多少問題あります。
		 */
		_event_scroll_show_images: function(){
			var self = this;

			/* 画像とメモリを同時にスクロールさせます。*/
			var node = $("#show_images, #details_scale");
			/* flagがtreuのときがドラッグイベント中です。 */
			var flag = false;

			//上下に動く必要はありませんのでxのみです。
			var start_x;

			node.mousedown(function(event){
				//初期化
				flag = true;
				start_x = event.clientX;
				return false;
			});

			node.mousemove(function(event){
				var offset_x;
				var WIGHT = GS.SCROLL_WIGHT;

				if(flag){
					offset_x = WIGHT * (event.clientX - start_x);
					offset_x *= self.layer;
					var co = self.get_current_offset();
					self.slide_with_offset(co - offset_x);
					self.view.start -= offset_x;
					start_x = event.clientX;
					self.update();

				}
				return false;

			});

			node.mouseup(function(){
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
		  その位置をスタートに変更します。

		  ドラッグの場合
		  スタートの位置は常に左側から
		  ドラッグの大きさと縮小拡大は対応させます。

		  計算式
		  IMAGE_WIDTH : MAX_LENGTH = offsetX : view.start
		 */
		_event_overview: function(){
			var self = this;
			/*
			  mousedownイベント開始
			 */
			var flag = false;
			var start_x;
			var node = $("#overview  canvas.box");

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

			node.mouseout(function(event){
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

			  todo: クリックの際にドラッグ判定されない様に、
			  一定の幅はクリック判定とさせます。
			 */
			var flag_drag = false;
			var first_start;
			node.mousedown(function(event){
				//イベントの初期化
				flag = true;
				start_x = event.offsetX;
				$(this).clearCanvas();
				first_start = self.view.start;
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
							//ドラッグと同じ方向に動かします。
							-(event.offsetX - start_x),
							first_start,
							length);
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

			node.mouseout(function(event){
				flag = false;
				flag_drag = false;
			});
		},

		/*
		  cssの初期化をします。
		 */
		_init_html: function(){
			//.center
			$(".center").css("width", GS.IMAGE_WIDTH);
			$("#wrap_show_images").css("width", GS.IMAGE_WIDTH);

			//region
			$("#region .center").css("height", GS.REGION_HEIGHT);
			$("#region_scale").attr("height", GS.OVERVIEW_HEIGHT);

			//overview
			$("#overview .center").css("height", GS.OVERVIEW_HEIGHT);
			$("#overview_scale").attr("width", GS.IMAGE_WIDTH);
			$("#overview_scale").attr("height", GS.OVERVIEW_HEIGHT);

			//canvas
			$("canvas").attr("width", GS.IMAGE_WIDTH);
			$("canvas").attr("height", GS.OVERVIEW_HEIGHT);
			$("canvas.box").css("top", (- GS.OVERVIEW_HEIGHT) + "px");

			//details
		},

		_update_ruler: function(){
			var node= $("#ruler_rect");
			var height = $("#wrap_show_images").css("height");
			node.css("height", height);

			var view = this.get_view();
			var layer = this.get_layer();
			var salt = GS.RULER_WIDTH / 2;
			var slide = Utility.px2int($("#ruler img").css("left"));
			var dna = GS.change_image2dna(slide + salt, view.start,layer);
			$("#ruler_data").text(Math.floor(dna));
		},

		_init_ruler: function(){
			var self = this;
			var node = $("#ruler img");
			$("#ruler_rect").hide()
			node.click(function(event){
				$("#ruler_rect").toggle();
			});

			var path = GS.PATH.images + "browser/ruler-icon.png"
			node.attr("src", path);
			node= $("#ruler_rect");
			node.css("height", 0);
			var flag_drag = false;
			var startX;
			var left;
			//ルーラの大きさです。
			var WIDTH = GS.RULER_WIDTH;

			node = $("#ruler_rect, #ruler img");
			node.mousedown(function(event){
				flag_drag = true;
				startX = event.screenX;
				left = Utility.px2int($(this).css("left"));
				return false;
			});

			//マウスダウンしている間は動かす様にします。
			//offsetXは使えません。
			$("*").mousemove(function(event){
				if(flag_drag){
					
					var offset = event.screenX - startX;
					var slide = left + offset
					if(0 <= slide && slide <= GS.IMAGE_WIDTH - GS.RULER_WIDTH){
						node.css("left", slide + "px");
						var view = self.get_view();
						var layer = self.get_layer();
						var salt = GS.RULER_WIDTH / 2;
						var dna = GS.change_image2dna(slide + salt, view.start,layer);
						$("#ruler_data").text(Math.floor(dna));
					}
				}
			});

			node.mouseup(function(event){
				flag_drag = false;
			})
				.mouseout(function(event){
					//flag_drag = false;
				});
		},
		

		_init_set_options: function(){
			var layers = GS.LAYER_VALUES;
			for(var i = 0 ; i < layers.length; i++){
				var n = $("#controller_select").append("<option />");
				n = n.children(":last");
				n.attr("value", layers[i]);
				//to do 表示の仕方を変更する1000 => 1k
				l = Utility.change_number(layers[i])
				n.text("show " + l + "bp");
			}
		},

		/*
		  viewのメモリを刻みます。
		  他のと比べて高さは小さくします。
		 */
		_init_details: function(){
			var ctx = $("#details_scale");
			//背景を描写します。
			var background = {
				fillStyle: "#ffe",
				x:0, y:0,
				width: GS.IMAGE_WIDTH,
				height: GS.OVERVIEW_HEIGHT,
				fromCenter: false
			}

			ctx.drawRect(background);
		},

		/*
		  全長を表示するメモリを刻みます。
		*/
		_init_overview: function(){
			var color = "#000";
			var ctx = $("#overview_scale");

			//背景を描写します。
			var background = {
				fillStyle: "#E0E0E0",
				x:0, y:0,
				width: GS.IMAGE_WIDTH,
				height: GS.OVERVIEW_HEIGHT,
				fromCenter: false
			}

			ctx.drawRect(background);

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

		   todo: initとupdateの役割を分けます。
		*/
		_update_region: function(start ,layer, size){
			var color = "#000";
			var ctx = $("#region_scale");
			var stop = start + layer - 1;

			ctx.clearCanvas();

			//背景を描写します。
			var background = {
				fillStyle: "#ffffcc",
				x:0, y:0,
				width: GS.IMAGE_WIDTH,
				height: GS.REGION_HEIGHT,
				fromCenter: false
			}

			ctx.drawRect(background);

			var vertical_line = {
				fillStyle: color,
				x: 0, y: 23,
				width: 1,
				height: 4,
				fromCenter: false,
			}

			//描写する両端のメモリの値
			var bothends = Utility.get_side_point(start, layer, size);
			var DNAlength = bothends.stop - bothends.start + 1;
			var interval = Utility.get_interval(DNAlength);

			//最も大きくて、割り切れる、プロットする点
			var last = bothends.stop - (bothends.stop % layer);

			//todo: yの値はREGION_HEIGHTから参照させます。

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
				 text.x =x;
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
				height:GS.REGION_HEIGHT,
				fromCenter: false,
			}

			ctx = $("#region  canvas.box");
			this.region_box = new Box(ctx ,rect , bothends.start, bothends.stop);
			this.region_box.draw();
		},
	};

	//グローバル空間に登録します。
	window.genome = genome;

}(window));

//global variables
var _Genome;
var Utility = new Utility();
var GS = new GlobalSettings();

//init
window.onload = function(){
	init();
	function init(){
		//はじめに表示するのは#mainだけです。
		$(".other_main").hide();

		$.get(GS.URL + "/get_imagepath",{},function(data){
			//serverからのデータを変換します。
			var json = Utility.string2json(data);

			//global settingsに代入します。
			GS.datasources = json.datasources;
			GS.seq_ids = json.seq_ids;
			GS.tracks = json.tracks;
			GS.path = json.path;
			GS.MAX_LENGTH = json.max_length;

			//各値の初期値を設定します。
			//配列の0番目はserverに保証されています。
			//cookieが設定してある場合は置き換わります。
			var ds = GS.datasources[0];
			var id = GS.seq_ids[ds][0];
			var tr = GS.tracks[ds][id][0];

			/* 
			   datasourceとseq_idは一つに決めます。
			 */
			var loads = {
				datasource: ds,
				seq_id:  id,
				tracks: tr,
				start: 1,
				layer: 100,
			};

			//loadsを一部書き換えます。
			for(var i in loads){
				if($.cookie(i) !== null){
					//文字列から数値に変換します。
					var num = Math.floor($.cookie(i));
					if(isNaN(num)){
						loads[i] = $.cookie(i);
					}
					else{
						loads[i] = num;
					}
				}
			}

			event_click();

			//各項目の初期化もします。
			init_datasources(GS.datasources);
			init_seq_ids(GS.seq_ids[loads.datasource]);
			init_tracks(loads.datasource, loads.seq_id);
		

			$("#datasources").val(loads.datasource);
			$("#seq_ids").val(loads.seq_id);
			GS.c_datasource = loads.datasource;
			GS.c_seq_id = loads.seq_id;

			var tracks = GS.tracks[loads.datasource][loads.seq_id];
			var path = [];
			path.push (GS.path[loads.datasource][loads.seq_id][tracks[0]]);
			check_tracks(path);

			_Genome = new genome(loads.start, loads.layer, path);
		})
	}

	/* checkboxの選択イベントの際に実行します。 */
	function update_genome(start, layer, name){
		var node = $("#details");
		if(name.length <= 0){
			node.hide();
		}
		else{
			node.show();
		/* start layer nameを指定します。 */
		_Genome.first_show(start, layer, name);
		}
	}

	function _set_select(node, value, text){
		if(value.length !== text.length)
			throw "配列の数があっていません。";
		node.empty();
		for(var i = 0; i < value.length; i++){
			node.append("<option />");
			var child = node.children(":last");
			child.attr("value", value[i]);
			child.text(text[i])
		}
	}

	function event_click(){
		/* クリックするとその周辺を表示、非表示にします。 */
		var minus = GS.PATH.images + "browser/minus.png";
		var plus = GS.PATH.images + "browser/plus.png";
		$("img.minus")
			.attr("src", minus)
			.click(function(){
				var c = $(this).parent().parent().find(".click_hide");
				if(c.css("display") === "none"){
					$(this).attr("src", minus);
					c.show();
				}
				else{
					$(this).attr("src", plus);
					c.hide();
				}
			});

		$("#tab_menu > ul > li").click(function(event){
			var self = $(this);
			var main = $("#main");
			var slct = $("#select_tracks");
			var prfr = $("#preferences");

			var text = self.text();
			if(text === "Select Tracks"){
				main.hide();
				slct.slideDown();
			}
			else if (text === "Browser"){
				main.slideDown();
				slct.hide();
			}
			if(text === "Preferences"){
				main.hide();
			}
		});
	}

	/* 一度セットしたら変更はありません。 */
	function init_datasources(ds){
		var node = $("#datasources");
		_set_select(node, ds, ds);

		/*
		  イベント後に再度読み込みさせます。
		  datasourceを変更させた場合
		  seq_idとtracksも同時に変化させます。
		*/
		node.change(function(){
			var ds = $("#datasources").val();
			var ids = GS.seq_ids[ds];
			$.cookie("datasource", ds);
			$.cookie("seq_id", GS.seq_ids[ds][0]);
			location.reload();
		});
	}


	function init_seq_ids(ids){
		var node = $("#seq_ids");
		_set_select(node, ids, ids);

		node.change(function(){
			var id = node.val();
			$.cookie("seq_id", id);
			location.reload();
		});
	}

	function check_tracks(name){
		for(var i = 0; i < name.length; i++){
			var node = $("#select_tracks_form input[path='" + name +"']");
				node.attr("checked","checked");
		}
	}

	/*
	  datesourceとseq_idsからselect tracksで表示するtrackを決めます。
	 */
	function init_tracks(ds, id){
		var tracks = GS.tracks[ds][id];
		var node = $("#select_tracks_form");
		node.empty();
		for(var i = 0; i < tracks.length; i++){

			var str = "<input type='checkbox'/>"
			node.append(str);
			var child = node.children(":last");
			var p = GS.path[ds][id][tracks[i]];
			child.attr("path", p);

			str = "<label />";
			node.append(str);
			var child = node.children(":last");
			child.text(tracks[i]);

			GS.c_tracks.push({p: tracks[i]});
		}

		/* checkbox */
		$("#select_tracks input").change(function(){
			var node = $("#select_tracks input:checked")
			var name = [];
			for(var i = 0; i < node.length; i++){
					name.push(node.eq(i).attr("path"));
			}

			//新しく画像を指定し直します。
			var start = _Genome.get_view().start;
			var layer = _Genome.get_layer();
			update_genome(start, layer, name);
		});
	}
};

function default_image(){
	$(this).attr("src", "/static/images/browser/noImage.jpg");
	$(this).css("width", GS.IMAGE_WIDTH);
	$(this).css("height", 300);
}
