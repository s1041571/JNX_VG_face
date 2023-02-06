/* 純前端處理 */
/* 全域變數 */
var viewFlag = 0    // 0為即時,1為過往
var can = document.getElementById("canvas");    // Area Canvas
var can2 = document.getElementById("canvas2");  // Bili Canvas
var img = document.getElementById("mapPic");    // 串流影像
can.width = img.width;
can.height = img.height;
var ctx = can.getContext('2d');
var ctx2 = can2.getContext('2d');
var canSave = document.getElementById("canvasSave");
var ctxSave = canSave.getContext('2d');
var drawArea = SVG().addTo('#imageMap').size('100%', '100%');   //新建SVG圖層 for圍籬區域
drawArea.attr('id', 'svgArea');
var drawBili = SVG().addTo('#imageMap').size('100%', '100%');   //新建SVG圖層 for比例尺
drawBili.attr('id', 'svgBili');
var pointX, pointY;
var pointArr = []; //存放坐標的陣列

ctx.strokeStyle = '#f06';   //線條顏色
ctx.lineWidth = 2;          //線條粗細
ctxSave.strokeStyle = '#f06';
ctxSave.lineWidth = 2; 

var oIndex = -1; //判断鼠标是否移动到起始点处，-1为否，1为是
var crood = ""; 
var InfoID; var polyId;

//當網頁DOM 載入完成後的處理事項
$(document).ready(function () {
    // $('#example').DataTable();
    $('[data-toggle="tooltip"]').tooltip();
    $("#loading").hide();
    $('#mainPage').click(); // 原MainPageOn();
    $('#svgBili').css('display','none');
    $('#weights_list').multiselect();
    $('#class_list').multiselect({
        maxHeight: 200,
        includeSelectAllOption: true,
    });

    if($("#check_mail").prop("checked") == false){
        $('#mailGroup').css('display','none');
    }
});

//當視窗大小變更，作 resize()
$(window).on("resize", function () {
    var coord_list =[];
    for(var obj of $("#markInfo").find("input")){
        coord_list.push(obj.defaultValue);
    }
    var bili_coord = $('#lineInfo').val();
    resize(coord_list,bili_coord); //canvas responsive
});

//隨畫面解析度變動，更新畫布座標
function resize(area_coord_array,bili_coord) {
    /* area_coord_array, bili_coord 傳入參數皆為轉換後的`百分比`座標 */
    can.width = img.width;
    can.height = img.height;
    can2.width = img.width;
    can2.height = img.height;
    canSave.width = img.width;
    canSave.height = img.height;
    drawArea.clear(); 
    drawBili.clear();
    var new_coordStr = "";
    area_coord_array.forEach(coord => {
        coord_list = coord.split(' ')
        for (var coord_group of coord_list) {
            if(coord_group=="") continue
            else{
                coord = coord_group.split(',') 
                new_coordStr += ((coord[0]/100*img.width).toFixed(0)) +','+((coord[1]/100*img.height).toFixed(0)) +' ';
            }
        }
        drawSVG(new_coordStr,drawArea)//因畫布比例變動，須更新畫布上座標
        new_coordStr ="";
    });

    bilicoord_list = bili_coord.split(' ')
    for (var coord_group of bilicoord_list) {
        if(coord_group=="") continue
        else{
            coord = coord_group.split(',') 
            new_coordStr += ((coord[0]/100*img.width).toFixed(0)) +','+((coord[1]/100*img.height).toFixed(0)) +' ';
        }
    }
    drawSVG(new_coordStr,drawBili) //因畫布比例變動，須更新畫布上座標
}

//前端 顯示系統當前時間
function ShowTime() {
    var NowDate = new Date();
    var Y = NowDate.getFullYear();
    var M = NowDate.getMonth() + 1;
    var D = NowDate.getDate();
    var h = NowDate.getHours();
    var m = NowDate.getMinutes();
    var s = NowDate.getSeconds();
    var weekday = new Array(7);
    weekday[0] = "星期日";
    weekday[1] = "星期一";
    weekday[2] = "星期二";
    weekday[3] = "星期三";
    weekday[4] = "星期四";
    weekday[5] = "星期五";
    weekday[6] = "星期六";

    var week = weekday[NowDate.getDay()];
    document.getElementById('showbox').innerHTML = Y + "/" + M + "/" + D + "  " + week + "    " + '    ' + h + ':' + m + ':' + s;
    setTimeout('ShowTime()', 1000);
}

window.onload = function(){
    var TabsIndex = sessionStorage.getItem('TabsIndex');
    if(TabsIndex != null){
        $('#titleTabs>.nav-item>.nav-link').removeClass('active')
        $('#titleTabs>.nav-item>.nav-link').eq(TabsIndex).addClass('active');
        $('#titleTabs>.nav-item>.nav-link').eq(TabsIndex).click();
        var target_id= $('#titleTabs>.nav-item>.nav-link').eq(TabsIndex)[0].href.split('#')[1];
        $('#'+target_id).addClass('show').addClass('active').siblings().removeClass('show').removeClass('active');
        if(TabsIndex==2){ //設定頁要做frame resize
            var area_coord_list =[];
            for(var obj of $("#markInfo").find("input")){
                area_coord_list.push(obj.defaultValue);
            }
            var bili_coord = $('#lineInfo').val();
            resize(area_coord_list, bili_coord);
        }
    }
}

//切換標籤頁時 記錄頁籤 => 重整頁面後能回到最後瀏覽的頁籤
$('#titleTabs li').mousedown(function(){
    var title = $(this).index()
    sessionStorage.setItem('TabsIndex',title);
});

//當按下模型切換Btn時，顯示loading畫面
$(".scene_btn").click(function () {
    $("#loading").show();
});


//送出form(切換模型)前，檢查`類別選單(select list)`有無選取
function check_classes() {
    if ($('#class_list').val() = "") {
        Swal.fire({ text: "請先記得選擇類別！", timer: 1200 })
        return false
    }
    else
        return true
}

//通報群組check
$("#check_mail").change(function() {
    if(this.checked)
        $('#mailGroup').css('display','');
    else
        $('#mailGroup').css('display','none');

});

//預覽圖片
function review_imgfile(filename){
    $('#img_review').attr('src', `/show_img/alarm_msg/${filename}`);
    $('#review_filename').html(`${filename}.jpg`);
}

//計算圍籬比例尺
function bili() {
    var bili_canvas = document.getElementById('mapPic');
    w = bili_canvas.width;
    h = bili_canvas.height;
    var coordStr = $('#lineInfo').val();
    var inputD = $('#input_distance').val();
    if (coordStr == null) Swal.fire({ title: "請先在區域中畫線！",icon: 'warning',showConfirmButton: false, timer: 1200,toast: true});
    else if (inputD.length == 0) Swal.fire({ title: "請先輸入數值！",icon: 'warning',showConfirmButton: false, timer: 1200,toast: true});
    else {
        var new_coordStr = '';
        coord_list = coordStr.split(' ')
        for (var coord_group of coord_list) {
            if(coord_group=="") continue
            else{
                coord = coord_group.split(',') 
                new_coordStr += ((coord[0]/100*w).toFixed(0)) +','+((coord[1]/100*h).toFixed(0)) +' ';
            }
        }
        var coordSet = new_coordStr.split(" ");
        var arr1 = coordSet[0].split(',');
        var arr2 = coordSet[1].split(',');
        var d = Math.round(Math.sqrt(Math.pow((arr1[0] - arr2[0]), 2) + Math.pow((arr1[1] - arr2[1]), 2)))
        var bili = (inputD / d).toFixed(2);
        $('#result_distance').attr('value', d);
        $('#result_bili').attr('value', bili);
        $('#saveBili_Btn').css('display','');
    }
}


/* 以下為創建/畫線/拉取 虛擬圍籬 */
// SVG 創建圖案
function drawSVG(crood, drawObj) {
    var test1 = crood.split(' ');
    var test2 = test1[0].split(',');
    var group = drawObj.group()
    if (drawObj.node.id == 'svgArea') {
        polyId = $('#svgArea').find('polygon').length;
        var polygon = group.polygon(crood).move(test1[0]).fill({ color: '#f06', opacity: 0.1 }).stroke({ color: '#f06', opacity: 1, width: 2.5 })
        group.text('第' + (parseInt(polyId)+1) + '組').cx(parseInt(test2[0])).cy(test2[1]).font({ family: '微軟正黑體', weight: 'bold' }).fill({ color: '#fff' })
        group.attr('id', 'poly' + polyId)
    }
    else {
        var polygon = group.polygon(crood).move(test1[0]).fill({ color: '#01fff4', opacity: 0.1 }).stroke({ color: '#01fff4', opacity: 1, width: 2.5 })
        group.attr('id', 'line1')
    }
}

//畫好的座標組資訊 生成顯示於前端
function createXYinfo(coord, img_width, img_height, divID) {
    var InfoHTML = "";
    var obj = "";
    var new_coordStr = "";
    coord_list =coord.split(' ')
    //轉換成百分比座標
    for (var coord_group of coord_list) {
        if(coord_group=="") continue
        else{
            coord = coord_group.split(',') 
            new_coordStr += (((coord[0]/img_width)*100).toFixed(1)) +','+(((coord[1]/img_height)*100).toFixed(1)) +' ';
        }
    }
    if (divID == 'markInfo') {
        InfoID= $('#markInfo').find('input').length+1;
        var div = document.createElement('div');
        div.id = 'mInfo' + InfoID; div.className = 'input-group mb-3 col-md-9 col-sm-5';
        document.getElementById("markInfo").appendChild(div);
        InfoHTML += "<div class='input-group-prepend'>";
        InfoHTML += "<span class='input-group-text'>座標組" + InfoID + "</span>";
        InfoHTML += "</div>";
        InfoHTML += "<input type='text' class='form-control' id='coordInfo" + InfoID + "' value='" + new_coordStr + "' readonly>";
        InfoHTML += "<div class='input-group-append'>";
        InfoHTML += "<button class='btn btn-outline-danger' type='button' id='poly" + (parseInt(InfoID) - 1) + "' onclick='delShape(this)'>刪除</button>";
        InfoHTML += "</div>";
        obj = document.getElementById('mInfo' + InfoID);
        obj.innerHTML = InfoHTML;
    }
    else {
        var div = document.createElement('div');
        div.id = 'pInfo'; div.className = 'input-group mb-3 col-md-6 col-sm-5';
        document.getElementById("markInfo2").appendChild(div);
        InfoHTML += "<div class='input-group-prepend'>";
        InfoHTML += "<span class='input-group-text'>座標組</span>";
        InfoHTML += "</div>";
        InfoHTML += "<input type='text' name='input_biliCoord' class='form-control' id='lineInfo' value='" + new_coordStr + "' readonly>";
        InfoHTML += "<div class='input-group-append'>";
        InfoHTML += "<button class='btn btn-outline-danger' type='button' id='line1' onclick='delShape(this)'>刪除</button>";
        InfoHTML += "</div>";
        obj = document.getElementById('pInfo');
        obj.innerHTML = InfoHTML;
    }

}

/*点击画点*/
$(can).click(function (e) {
    if (e.offsetX || e.layerX) {
        pointX = e.offsetX == undefined ? e.layerX : e.offsetX;
        pointY = e.offsetY == undefined ? e.layerY : e.offsetY;
        var piX, piY;
        //   if( $('#poly0').length!=0 ) alert('已有圍籬區域紀錄，若需變更請先刪除座標組');
        //   else{
        if (oIndex > 0 && pointArr.length > 0) {
            piX = pointArr[0].x;
            piY = pointArr[0].y;
            //画点
            makearc(ctx, piX, piY, GetRandomNum(2, 2), 0, 180, 'rgba(102,168,255,0.1)');
            pointArr.push({ x: piX, y: piY });
            area_origin_coord = crood;
            createXYinfo(crood,img.width,img.height, 'markInfo');
            drawSVG(crood, drawArea);
            canvasSave(pointArr); //保存点线同步到另一个canvas
            saveCanvas(); //生成画布
            crood = "";
        } else {
            piX = pointX;
            piY = pointY;
            makearc(ctx, piX, piY, GetRandomNum(2, 2), 0, 180, 'rgba(102,168,255,0.1)');
            pointArr.push({ x: piX, y: piY });
            crood += piX + ',' + piY + ' ';
            canvasSave(pointArr); //保存点线同步到另一个canvas
        }
        // }
    }
});

$(can).mousemove(function (e) {
    $("#site").text("當前座標 : (" + e.offsetX + ',' + e.offsetY + ")");
    if (e.offsetX || e.layerX) {
        pointX = e.offsetX == undefined ? e.layerX : e.offsetX;
        pointY = e.offsetY == undefined ? e.layerY : e.offsetY;
        var piX, piY;
        /*清空画布*/
        ctx.clearRect(0, 0, can.width, can.height);
        /*鼠标下跟随的圆点*/
        makearc(ctx, pointX, pointY, GetRandomNum(6, 6), 0, 180, 'rgba(255, 0, 102,0.6)');

        if (pointArr.length > 0) {
            if ((pointX > pointArr[0].x - 15 && pointX < pointArr[0].x + 15) && (pointY > pointArr[0].y - 15 && pointY < pointArr[0].y + 15)) {
                if (pointArr.length > 1) {
                    piX = pointArr[0].x;
                    piY = pointArr[0].y;
                    ctx.clearRect(0, 0, can.width, can.height);
                    makearc(ctx, piX, piY, GetRandomNum(6, 6), 0, 180, 'rgba(255, 0, 102,0.6)');
                    oIndex = 1;
                }
            } 
            else {
                piX = pointX;
                piY = pointY;
                oIndex = -1;
            }
            /*开始绘制*/
            ctx.beginPath();
            ctx.moveTo(pointArr[0].x, pointArr[0].y);
            if (pointArr.length > 1) {
                for (var i = 1; i < pointArr.length; i++) {
                    ctx.lineTo(pointArr[i].x, pointArr[i].y);
                }
            }
            ctx.lineTo(piX, piY);
            // ctx.fillStyle = 'rgba(161,195,255,0.5)'; //填充颜色
            // ctx.fill(); //填充
            ctx.stroke(); //绘制
        }
    }
});

/*点击画点*/
$(can2).click(function (e) {
    if (e.offsetX || e.layerX) {
        pointX = e.offsetX == undefined ? e.layerX : e.offsetX;
        pointY = e.offsetY == undefined ? e.layerY : e.offsetY;
        var piX, piY;
        if ($('#line1').length > 0) Swal.fire({ text: "已有劃線紀錄，若需變更請先刪除座標", timer: 1200 });
        else {
            if (oIndex > 0 && pointArr.length > 0) {
                piX = pointX;
                piY = pointY;
                //画点
                makearc(ctx2, piX, piY, GetRandomNum(2, 2), 0, 180, 'rgba(102,168,255,0.1)');
                pointArr.push({ x: piX, y: piY });
                crood += piX + ',' + piY + ' ';
                createXYinfo(crood,img.width,img.height, 'markInfo2');
                drawSVG(crood, drawBili);
                canvasSave(pointArr); //保存点线同步到另一个canvas
                saveCanvas(); //生成画布
                crood = "";
            } else {
                piX = pointX;
                piY = pointY;
                makearc(ctx2, piX, piY, GetRandomNum(2, 2), 0, 180, 'rgba(102,168,255,0.1)');
                pointArr.push({ x: piX, y: piY });
                crood += piX + ',' + piY + ' ';
                canvasSave(pointArr); //保存点线同步到另一个canvas
            }
        }
    }
});

$(can2).mousemove(function (e) {
    $("#site").text("當前座標 : (" + e.offsetX + ',' + e.offsetY + ")");
    if (e.offsetX || e.layerX) {
        pointX = e.offsetX == undefined ? e.layerX : e.offsetX;
        pointY = e.offsetY == undefined ? e.layerY : e.offsetY;
        var piX, piY;
        /*清空画布*/
        ctx2.clearRect(0, 0, can.width, can.height);
        /*鼠标下跟随的圆点*/
        makearc(ctx2, pointX, pointY, GetRandomNum(6, 6), 0, 180, 'rgba(1, 255, 244,0.6)');

        if (pointArr.length > 0) {
            if (pointArr.length == 1) {
                piX = pointX;
                piY = pointY;
                ctx2.clearRect(0, 0, can2.width, can2.height);
                makearc(ctx, piX, piY, GetRandomNum(6, 6), 0, 180, 'rgba(1, 255, 244,0.6)');
                oIndex = 1;
            } 
            else {
                piX = pointX;
                piY = pointY;
                oIndex = -1;
            }
            /*开始绘制*/
            ctx2.beginPath();
            ctx2.moveTo(pointArr[0].x, pointArr[0].y);
            if (pointArr.length > 1) {
                for (var i = 1; i < pointArr.length; i++) {
                    ctx2.lineTo(pointArr[i].x, pointArr[i].y);
                }
            }
            ctx2.lineTo(piX, piY);
            // ctx.fillStyle = 'rgba(161,195,255,0.5)'; //填充颜色
            // ctx.fill(); //填充
            ctx2.stroke(); //绘制
        }
    }
});

// 存储已生成的点线
function canvasSave(pointArr) {
    // ctxSave.clearRect(0, 0, ctxSave.width, ctxSave.height);
    // ctxSave.beginPath();
    // if (pointArr.length > 1) {
    //     ctxSave.moveTo(pointArr[0].x, pointArr[0].y);
    //     for (var i = 1; i < pointArr.length; i++) {
    //         ctxSave.lineTo(pointArr[i].x, pointArr[i].y);
    //         ctxSave.fillStyle = 'rgba(161,195,255,0.5)'; //填充颜色
    //         //ctxSave.fill();
    //         ctxSave.stroke(); //绘制
    //     }
    //     ctxSave.closePath();
    // }
}

/*生成画布 结束绘画*/
function saveCanvas() {
    ctx.clearRect(0, 0, can.width, can.height);
    ctxSave.closePath(); //结束路径状态，结束当前路径，如果是一个未封闭的图形，会自动将首尾相连封闭起来
    ctxSave.fill(); //填充
    ctxSave.stroke(); //绘制
    pointArr = [];
}

/*清空选区*/
$('#deleteCanvas').click(function () {
    ctx.clearRect(0, 0, can.width, can.height);
    ctxSave.clearRect(0, 0, canSave.width, canSave.height);
    pointArr = [];
    $("#svgArea").empty();
    $("#markInfo").empty();
    // polyId = 0; InfoID = 1;
});

/*验证canvas画布是否为空函数*/
function isCanvasBlank(canvas) {
    var blank = document.createElement('canvas'); //创建一个空canvas对象
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() == blank.toDataURL(); //为空 返回true
}

/*canvas生成圆点*/
function GetRandomNum(Min, Max) {
    var Range = Max - Min;
    var Rand = Math.random();
    return (Min + Math.round(Rand * Range));
}
function makearc(ctx, x, y, r, s, e, color) {
    ctx.clearRect(0, 0, 199, 202); //清空画布
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, r, s, e);
    ctx.fill();
}

//刪除圖案
function delShape(obj) {
    var oParent = obj.parentNode.parentNode;
    document.getElementById(oParent.parentNode.id).removeChild(oParent);
    var item = obj.id;
    $("#" + item).remove();

    //更新markInfo
    var coord_list =[];
    for(var obj of $("#markInfo").find("input")){
        coord_list.push(obj.defaultValue);
    }
    $('#markInfo').children().remove();
    $('#svgArea').children().remove();
    var new_coordStr ='';
    coord_list.forEach(item => {
        coord_list = item.split(' ')
        for (var coord_group of coord_list) {
            if(coord_group=="") continue
            else{
                coord = coord_group.split(',') 
                new_coordStr += ((coord[0]/100*img.width).toFixed(0)) +','+((coord[1]/100*img.height).toFixed(0)) +' ';
            }
        }
        createXYinfo(new_coordStr,img.width,img.height,'markInfo');
        drawSVG(new_coordStr,drawArea);
        new_coordStr ='';
    });
}


// 表格DataTable 編輯/新增/刪除/儲存 功能
var keysArr = new Array("id", "area", "reason", "distance", "date");
function editContent(node) {
    if (!node.onEdit || node.onEdit != 'true') {
        var initValue = node.innerHTML;
        var input = document.createElement('input');
        input.type = 'text';
        input.value = initValue;
        input.style.width = node.clientWidth - 10;
        input.style.height = node.clientHeight - 6;
        node.innerHTML = '';
        node.appendChild(input);
        addEvent(input, callBackFunc);
        node.onEdit = 'true';
        input.select();
        input.focus();
    }
}
function callBackFunc() {
    var parentNd = this.parentNode;
    parentNd.innerHTML = this.value;
    parentNd.onEdit = 'false';
}

function addEvent(obj, callBack) {
    if (obj.addEventListener) {
        obj.addEventListener('blur', callBack, false);
    } else if (obj.attachEvent) {
        obj.onblur = callBack;
    } else {
        alert('error');
    }
}

function updateInfo() { //tableid是你要轉化的表的表名,是一個字串,如"example" 
    var rows = document.getElementById('example').rows.length; //獲得行數(包括thead) 
    var colums = document.getElementById('example').rows[0].cells.length; //獲得列數 
    var json = "[";
    var tdValue;
    for (var i = 1; i < rows; i++) { //每行 
        json += "{";
        for (var j = 0; j < colums; j++) {
            if (j === 5) { continue; }
            tdName = keysArr[j]; //Json資料的鍵 
            json += "'";
            json += tdName;
            json += "'";
            json += ":";
            tdValue = document.getElementById('example').rows[i].cells[j].innerHTML; //Json資料的值 
            json += "'";
            json += tdValue;
            json += "'";
            json += ",";
        }
        json = json.substring(0, json.length - 1);
        json += "}";
        json += ",";
    }
    json = json.substring(0, json.length - 1);
    json += "]";
    //        return json;
    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/info_Update",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(json),
        //dataType: 'json', //加入後會有post成功,但未執行success函式 -->因返回是字串而不是物件
        success: function (result) {
            alert(result);
        },
        error: function (errorInfo) {
            alert("更新失敗, error:" + errorInfo.message);
        }
    });
}
function delRow(obj) {
    var Row = obj.parentNode; //tr
    while (Row.tagName.toLowerCase() != "tr") {
        Row = Row.parentNode;
    }
    Row.parentNode.removeChild(Row); //刪除行
}
function createNewRow() {
    var num = document.getElementById("example").rows.length; //表格當前的行數
    var rowNum = num;
    var tr = document.createElement('tr');
    tr.id = 'row' + (rowNum + 1);
    document.getElementById("InfoTable").appendChild(tr);

    var td = document.getElementById('row' + (rowNum + 1));

    var objHTML = "";
    objHTML += "<td onclick='editContent(this)' name='id'></td>";
    objHTML += "<td onclick='editContent(this)' name='area'></td>";
    objHTML += "<td onclick='editContent(this)' name='reason'></td>";
    objHTML += "<td onclick='editContent(this)' name='distance'></td>";
    objHTML += "<td onclick='editContent(this)' name='date'></td>";
    objHTML += "<td onclick='editContent(this)' name='save'><button class='btn btn-danger' onclick='delRow(this)'><i class='far fa-trash-alt'></i>&nbsp;刪除</button></td>";

    td.innerHTML = objHTML;

}
