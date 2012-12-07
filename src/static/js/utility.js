Utility = function(){
	this.init.apply(this, arguments);
};

Utility.prototype = {
	init: function(){},

	/* 代入した数値の桁を返します。 */
	get_digits: function (v){
		//負の数は正にします。
		if(v < 0) v *= -1;
		
		var i = 1;
		while(true){
		if(v < Math.pow(10, i))break;
			i++;
		}
		return i;
	},

	/* 代入した数値の指定した桁の数字を返します。 */
	get_digit_number: function (v, num){

		//負の数は正にします。
		if(v < 0) v *= -1;
		var d = this.get_digits(v);
		var each = [0];

		/*
		  各桁を配列に代入していきます。

		  1234の場合
		  [0, 4, 3, 2, 1]
		  です。

		  0番目は0桁目として0を代入します。
		*/
		for(var i = 1; i <= d; i++){
			each.push(v % 10);
			v = Math.floor(v / 10);
		}

		if(each[num] === undefined)
			throw "指定した桁に問題があります。";

		return each[num];
	},

	/*
	  最高位から３番目を切り上げます。
	  365の場合、370になります。
	  360の場合は360のままです。
	*/
	roundout: function (v){

		if(v < 100)
			throw "桁に問題があります。";

		var d = this.get_digits(v);
		var first = this.get_digit_number(v ,d);
		var second = this.get_digit_number(v ,d - 1);
		
		var cutted = translate(first, second, d);
		if(cutted === v)
			return v;
		else{
			//secondが9でも動きます。
			return translate(first, second + 1, d);
		}

		function translate(f, s, d){
			return f * Math.pow(10, d - 1) + s * Math.pow(10, d - 2);
		}
	},

	/* 
	   数値の10%ずつの値と1%ずつの値をjsonにして返します。

	   input 250
	   ret { ten: [25, 50, ... , 250 ], one:[2.5 , 5, ... 250]}
	*/
	get_interval: function(number){
		//半端な数は切り上げます。
		if(number % 10 !== 0)
			number = this.roundout(number);

		var ten = [];
		var one = [];

		var first = number / 10;
		for(var i = 1; i <= 10 ; i++){
			ten.push(first * i);
		}

		first = number / 100;
		for(var i = 1; i <= 100; i++){
			one.push(first * i);
		}
		
		return json = {
			ten : ten,
			one : one,
		};

		//サーバーからのデータ変換をします。
		string2json: function(data){
			return eval("(" + data + ")");
		};

		/*
		  cssの値でpxの場合、とって数値にします。
		  "100px"(文字列) => 100(数値)
		*/
		px2int: function(str){
			return parseInt(str.replace("px" ,""))
		};

	},
};

u = new Utility(); //for debug
