//doGetでa_account.htmlを表示する
function doGet(e) {
  //ページ取得
  let page = e.parameter.page;
  Logger.log("GET page: "+page);
  //パラメータにページ属性がなかったら初期ページを入れる
  if (!page) {
    page = 'l_login';
    Logger.log("GET page: "+page);
  }

  //ページ設定、パラメータ設定
  const template = HtmlService.createTemplateFromFile(page);
  if (page === 'Search') {
    let result = "";
    template.result = result;
  }

  //meta属性設定
  return template
    .evaluate()
    // .setTitle('アカウント作成画面')
    //スマホ画面対応
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

//post送信後の処理
function doPost(e) {
  //スプシ取得
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  //シート取得
  const user = ss.getSheetByName('user');
  const logA = ss.getSheetByName('logA');
  const s_sheet = ss.getSheetByName('Search');

  //パラメータ取得
  let lastPage = e.parameter.lastPage;
  Logger.log("POST lastPage: "+lastPage);
  //account変数
  let a_id = "none" //idをprofileEditに渡すため
  let a_error_judge = 0; //エラー判定用変数(エラー文を決めるためのやつ)
  //login変数
  let l_name = "";
  //serach変数
  let result = "";
  //エラーページ（初期値）
  let page = 'a_error';

  //ログイン情報入力後の処理-----------------------------------------
  if(lastPage === 'l_login') {
    Logger.log("【login処理】");
    l_name = e.parameters.l_name.toString();
    let l_password = e.parameters.l_password.toString();
    //あっていたらtrue、間違っていたらfalseが返ってくる
    let l_checkAccount = l_judgeAccounts(l_name, l_password);
    Logger.log("POST checkAccount: "+l_checkAccount);
    if(l_checkAccount) {
      page = 'profile';
    }else {
      page = 'l_error';
    }
  }
  //アカウント作成送信後の処理---------------------------------------
  else if (lastPage === 'a_account') {
    Logger.log("【account処理】");
    let a_mail = e.parameter.a_mail;
    a_id = e.parameter.a_id;
    Logger.log("POST a_idの長さ: "+a_id.length);
    let a_pass1 = e.parameter.a_pass1;
    let a_pass2 = e.parameter.a_pass2;
    Logger.log("POST\nmail: "+a_mail+"\nid: "+a_id+"\npass1: "+a_pass1+"\npass2: "+a_pass2);

    //パスワード確認が間違っていたら
    if (a_pass1 != a_pass2) {
      page = 'a_error';
      a_error_judge = 1;
    }
    //パスワードが8～24文字以内か
    else if(a_pass1.length < 8 || a_pass1.length > 24) {
      page = 'a_error';
      a_error_judge = 2;
    }
    //パスワードが大文字小文字数字をそれぞれ使っているか
    else if (!((/^[a-zA-Z0-9]+$/g).test(a_pass1) && (/[a-z]+/g).test(a_pass1) && (/[A-Z]+/g).test(a_pass1) &&(/\d/g).test(a_pass1))) {
      page = 'a_error';
      a_error_judge = 3;
    }
    //IDが15文字以内か
    else if (a_id.length > 15) {
      page = 'a_error';
      a_error_judge = 4;
    }
    //IDが環境依存文字を使っていないか
    else if (!((/^[\x20-\x7e]+$/g).test(a_id))) {
      page = 'a_error';
      a_error_judge = 5;
    }
    //メアドが使用可能文字を使っているか
    else if(!((/^[a-zA-Z0-9-_.@]+$/g).test(a_mail))) {
      page = 'a_error';
      a_error_judge = 6;
    }
    else {
      logA.getRange("A2").setValue('=IFNA(QUERY(user!B:B,"where B=\''+ a_mail +'\'"),"なし")');
      logA.getRange("B2").setValue('=IFNA(QUERY(user!A:A,"where A=\''+ a_id +'\'"),"なし")');
      //既にメアドが登録されていないか
      if (logA.getRange("A2").getValue() != "なし") {
        Logger.log(logA.getRange("A2").getValue());
        page = 'a_error';
        a_error_judge = 7;
      }
      //IDが重複していないか
      else if (logA.getRange("B2").getValue() != "なし"){
        Logger.log(logA.getRange("B2").getValue());
        page = 'a_error';
        a_error_judge = 8;
      }
      //正常時
      else {
        Logger.log("POST 正常！");
        //挿入用配列準備
        a_data = [];
        for (var i = 1; i < 27; i++) {
          if (i === 1) a_data.push(a_id);
          else if (i === 3) a_data.push(a_mail);
          else if (i === 4) a_data.push(a_pass1);
          else a_data.push("");
        }
        Logger.log("POST data: "+a_data);
        //配列挿入
        user.appendRow(a_data);
        Logger.log("POST 挿入完了！");

        //次ページへ
        page = "profileEdit";
      }
    }
  }
  //プロフィール設定後の処理---------------------------------------
  else if (lastPage === 'profileEdit') {
    Logger.log("【profileEdit処理】");
    //入れたい値(仮)
    let p_name =e.parameter.p_name;
    let p_profile = e.parameter.p_profile;//パラメータのnameを変更
    let p_game = [e.parameter.gamename1,e.parameter.gamename2,e.parameter.gamename3];
    let p_gameTag = [e.parameter.p_tag1,e.parameter.p_tag2,e.parameter.p_tag3,e.parameter.p_tag4,e.parameter.p_tag5,e.parameter.p_tag6];
    let URL = e.parameter.p_url;//URLを格納

    //---横のセルに入れていく処理---
    //id検索(正規表現を使った検索)
    let p_id = "^"+e.parameter.id+"$"; //検索対象
    Logger.log("POST p_id: "+p_id);
    let p_finder = user.createTextFinder(p_id).useRegularExpression(true);
    let p_results = p_finder.findAll();
    Logger.log("POST p_results[0]: "+p_results[0]);
    let p_ans = p_results[0].getA1Notation();
    Logger.log("POST p_ans: "+p_ans);

    let p_row = p_ans.slice(1); //idから行番号割り出し
    Logger.log("POST p_row: "+p_row);
    
    //nameの挿入
    user.getRange("E" + p_row).setValue(p_name);
    //profileの挿入
    user.getRange("G" + p_row).setValue(p_profile);
    //game_0～game_9の挿入
    p_column_game = ["H","I","J","K","L","M","N","O","P","Q"];
    for (var i = 0; i < 10; i++) {
      user.getRange(p_column_game[i] + p_row).setValue(p_game[i]);
    }
    //game_tag0～game_tag9の挿入
    p_column_gameTag = ["R","S","T","U","V","W","X","Y","Z","AA"];
    for (var i = 0; i < 10; i++) {
      user.getRange(p_column_gameTag[i] + p_row).setValue(p_gameTag[i]);
    }
    user.getRange("F" + p_row).setValue(URL);//アイコンセルに格納
    //user.getRange("A"+p_row).getValues();

    page = 'profile';
  }
  //プロフィール編集へ遷移する処理---------------------------------
  else if (lastPage === 'profile') {
    Logger.log("【profile処理】");
    page = 'profileEdit';
  }
  //検索の処理--------------------------------------------------
  else if (lastPage === 'Search') {
    Logger.log("【Search処理】");
    s_sheet.getRange("A1").setValue(e.parameter.s_name);
    divide();
    page = 'Search';
  }

  Logger.log("POST page: "+page);

  //ページ設定
  let template = HtmlService.createTemplateFromFile(page);
  //何か起こったらエラーページに飛ばす処理
  // try {
    //profileEditパラメータ設定------------------------------------------
    if (page === 'profileEdit') {
      //id検索(正規表現を使った検索)
      let p_id = "";
      Logger.log("POST lastPage: "+lastPage);
      if(lastPage === 'a_account') {
        p_id = a_id;
      }else if(lastPage === 'profile') {
        p_id = e.parameter.id;
      }else {p_id = "error";}

      let p_idEx = "^"+p_id+"$"; //検索対象
      Logger.log("POST p_idEx: "+p_idEx);
      let p_finder = user.createTextFinder(p_idEx).useRegularExpression(true);
      let p_results = p_finder.findAll();
      Logger.log("POST p_results[0]: "+p_results[0]);
      let p_ans = p_results[0].getA1Notation();
      Logger.log("POST p_ans: "+p_ans);

      let p_row = p_ans.slice(1); //idから行番号割り出し
      Logger.log("POST p_row: "+p_row);
      
      let p_data = user.getRange(p_row,1,1,27).getValues(); //配列データ取得
      Logger.log("POST p_data: "+p_data);
      template.name = p_data[4];
      template.icon = p_data[5];
      template.profile = p_data[6];
      template.game1 = p_data[7];
      template.game2 = p_data[8];
      template.game3 = p_data[9];
      template.gameTag1 = p_data[17];
      template.gameTag2 = p_data[18];
      template.gameTag3 = p_data[19];
      template.gameTag4 = p_data[20];
      template.gameTag5 = p_data[21];
      template.gameTag6 = p_data[22];
    }
    //profileパラメータ設定------------------------------------------
    if (page === 'profile') {
      let p_id2 = "";
      Logger.log("POST lastPage: "+lastPage);
      if(lastPage === 'l_login'){
        p_id2 = l_name;
      }else if(lastPage === 'profileEdit'){
        p_id2 = e.parameter.id;
      }

      let p_idEx2 = "^"+p_id2+"$"; //検索対象
      Logger.log("POST p_idEx2: "+p_idEx2);
      let p_finder2 = user.createTextFinder(p_idEx2).useRegularExpression(true);
      let p_results2 = p_finder2.findAll();
      Logger.log("POST p_results2[0]: "+p_results2[0]);
      let p_ans2 = p_results2[0].getA1Notation();
      Logger.log("POST p_ans2: "+p_ans2);
      let p_row2 = p_ans2.slice(1); //idから行番号割り出し
      Logger.log("POST p_row2: "+p_row2);
      template.id_row = p_row2 - 1; //row
      Logger.log("POST id_row: "+p_row2);
    }

    //account -> profileEditパラメータ設定------------------------------------------
    if (page === 'profileEdit' && lastPage === 'a_account') {
      Logger.log("【account->profileEditパラメータ設定】");
      Logger.log("POST a_id: "+a_id);
      template.id = a_id;
    }
    //login -> profileパラメータ設定------------------------------------------
    else if (page === 'profile' && lastPage === 'l_login') {
      Logger.log("【login->profileパラメータ設定】");
      Logger.log("POST l_name: "+l_name);
      template.id = l_name;
    }
    //profileEdit -> profileパラメータ設定------------------------------------------
    else if (page === 'profile' && lastPage === 'profileEdit') {
      Logger.log("【profileEdit->profileパラメータ設定】");
      Logger.log("POST param.id: "+e.parameter.id);
      template.id = e.parameter.id;
    }
    //profile -> profileEditパラメータ設定------------------------------------------
    else if (page === 'profileEdit' && lastPage === 'profile') {
      Logger.log("【profile->profileEditパラメータ設定】");
      Logger.log("POST param.id: "+e.parameter.id);
      template.id = e.parameter.id;
    }
    //account -> a_errorパラメータ設定------------------------------------------
    else if (page === 'a_error') {
      Logger.log("【accountパラメータ設定】");
      Logger.log("POST error_judge: "+a_error_judge);

      if (a_error_judge === 1) {
        template.error_txt = "確認用パスワードが一致しません。";
      }else if (a_error_judge === 2) {
        template.error_txt = "パスワードは8～24文字で入力してください。";
      }else if (a_error_judge === 3) {
        template.error_txt = "パスワードは【大文字・小文字・数字】をそれぞれ使用して入力してください。";
      }else if (a_error_judge === 4) {
        template.error_txt = "IDは15文字以内で入力してください。";
      }else if (a_error_judge === 5) {
        template.error_txt = "IDは半角で入力してください";
      }else if (a_error_judge === 6) {
        template.error_txt = "メールアドレスは【大文字小文字、数字、アンダーバー(_)、ハイフン(-)、ドット(.)】で入力してください。";
      }else if (a_error_judge === 7) {
        template.error_txt = "既にメールアドレスが登録されています。別のメールアドレスを入力してください。";
      }else if (a_error_judge === 8) {
        template.error_txt = "既にIDが登録されています。別のIDを入力してください。"
      }
    }
    //searchパラメータ設定------------------------------------------
    else if (page === 'Search') {
      Logger.log("【searchパラメータ設定】");
      if(s_sheet.getRange("B1").isBlank()){
        s_sheet.insertColumnsAfter(3,5)
        result = ['<p>検索対象が見つかりません</p>']
      }else if(s_sheet.getRange("A1").isBlank()){
        s_sheet.insertColumnsAfter(3,5)
        result = ['<p>文字を入力して下さい</p>']
      }else{
        result = ["<table><tr><th>ID</th><th>ユーザー名</th><th>ゲーム名</th></tr>"];
        for (let s_i10 = 1; s_i10 <= s_sheet.getLastRow(); s_i10++) {
          result.push("<tr><td>");
          result.push(Array.prototype.concat.apply([], s_sheet.getRange(s_i10, 2, 1, 12).getValues()).join("</td><td>"));
          result.push("</td></tr>");
        }
        result.push("</table>");
      }
      template.result = result.join("");
      s_sheet.clear();
    }
  // }catch(e) {
  //   //エラーに飛ばす
  //   template = HtmlService.createTemplateFromFile('error');
  //   template.error_txt = "エラーが発生しました。ログイン画面に戻ります。";
  // }


  //meta属性設定
  return template
    .evaluate()
    //スマホ画面対応
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

//ファイル読み込み用共通メソッド(css,js用)
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

//アプリURL取得用共通メソッド
function getAppUrl() {
  return ScriptApp.getService().getUrl();
}

//loginメソッド---------------------------------------------------
function l_judgeAccounts(l_name, l_password){
  //取ってくる行数
  var l_num = 100;

  //スプレッドシートをとってくる
  const l_sheets = SpreadsheetApp.getActiveSpreadsheet();

  const l_sheet = l_sheets.getSheetByName("user");  //シートをとってくる

  const l_accounts_name = l_sheet.getRange(2,1,l_num,1).getValues();  //IDとってくる
  const l_accounts_pass = l_sheet.getRange(2,4,l_num,1).getValues();  //パスワードとってくる
 
    Logger.log(l_accounts_name);
    Logger.log(l_accounts_pass);
  
  let l_judge = false;
  for(let l_i in l_accounts_name){　　//名前とパスワードがあっていればtrue、あってなければfalseを返す
    if(l_accounts_name[l_i] == l_name && l_accounts_pass[l_i] == l_password){
      l_judge = true;
      break;
    }
  }
  return l_judge;
}

//profileメソッド-------------------------------------------------
function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('user');
  // const sheet = SpreadsheetApp.getActiveSpreadsheet();
  var values = sheet.getDataRange().getValues();
  return values;
}

//serachメソッド--------------------------------------------------
function divide(){
  var s_sheet = SpreadsheetApp.getActive().getSheetByName("Search")
  var s_sheet1 = SpreadsheetApp.getActive().getSheetByName("user")
  var s_lang = s_sheet.getRange("A1").getValue()
  var s_langd = {}
  var s_word ={}
  var s_words ={}
  var s_ga ={}
  var s_re = null
  var s_l = 1
  var s_n = s_lang.length
  for(var s_i=0; s_i<s_n; s_i++){
    s_re = String(s_lang.slice(0,1))
    //1文字目切り出し
    s_lang = s_lang.slice(1,s_lang.length)
    if(s_re == ' '){
      s_l++
    }else{
      if(s_langd[s_l]==null){
        s_langd[s_l] = s_re;
      }else{
        s_langd[s_l] = s_langd[s_l]+s_re
      }
    }
  }
  for(var s_j=1; s_j<=s_l; s_j++){
    s_sheet.getRange(s_j,1).setValue(String(s_langd[s_j]))
    //書き込み
  }

  for(var s_num=0; s_num<s_l; s_num++){ 
    var s_value = s_sheet.getRange(s_num+1,1).getValue()
    var s_textFinder = s_sheet1.createTextFinder(s_value)
    //検索
    var s_cells = s_textFinder.findAll()

    Logger.log('ヒット数 ： ' + s_cells.length)
        
    for(var s_j=0; s_j<s_cells.length; s_j++){
      //Logger.log('セル位置 :  ' + s_cells[s_j].getA1Notation()) 
      s_word[s_j+1] = s_cells[s_j].getA1Notation()
      s_word[s_j+1] = s_word[s_j+1].substring(1)
      //行番号切り出し
      // s_word.sort()
      
    }

    if(s_words[1] == null){
      var s_len = 0
      for(var s_ma=1;s_ma<=s_j;s_ma++){
        s_words[s_ma] = s_word[s_ma]
        s_word[s_ma] = null
      }
    }else{
      for(var s_m = 1;s_m<=s_ma;s_m++){
        for(s_i=1;s_i<=s_j;s_i++){
          if(s_words[s_m] == s_word[s_i]){
            s_ga[s_len+1] = s_word[s_i]
            //Logger.log('len'+s_ga[s_len])
            s_len++
          }
        }
      }
    }
  }

  if(s_len == 0){
    for(var s_i1=1; s_i1<s_j+1; s_i1++){
      s_ga[s_i1] = s_words[s_i1]
    }
    s_len = s_j
  }
  

  for(var s_k=1; s_k<=s_len; s_k++){
    var s_nk = {}
    s_nk[s_k] = Number(s_ga[s_k]);
    var s_values = s_sheet1.getRange(s_nk[s_k],1,1,27)
    s_values.copyTo(s_sheet.getRange(s_k,2),{contentsOnly:true});
    //Logger.log('log'+s_k+' 実行済')
  }
  
  s_sheet.deleteColumns(3, 3);
  s_sheet.deleteColumns(4, 2);
}

function s_let(){
  var s_sheet = SpreadsheetApp.getActive().getSheetByName("Search")
  var s_ret= []
  Logger.log(s_sheet.getLastRow())
}
