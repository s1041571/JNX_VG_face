/* 純前端處理 */
/* 全域變數 */
var can = document.getElementById("canvas");
var can2 = document.getElementById("canvas2");
var img = document.getElementById("mapPic");

can.width = img.width;
can.height = img.height;
var drawArea = SVG().addTo('#imageMap').size('100%', '100%');
drawArea.attr('id', 'svgArea');
var drawBili = SVG().addTo('#imageMap').size('100%', '100%');
drawBili.attr('id', 'svgBili');
var ctx = can.getContext('2d');
var ctx2 = can2.getContext('2d');
var canSave = document.getElementById("canvasSave");

var ctxSave = canSave.getContext('2d');

var pointX, pointY;
var pointArr = []; //存放坐标的数组

ctx.strokeStyle = '#f06'; //线条颜色
ctx.lineWidth = 2; //线条粗细
ctxSave.strokeStyle = '#f06'; //线条颜色
ctxSave.lineWidth = 2; //线条粗细

var oIndex = -1; //判断鼠标是否移动到起始点处，-1为否，1为是
var crood = ""; var InfoID ; var polyId;

//圍籬設定 打開Modal
function open_fence_modal() {
    $('#vf-modal').modal('show');
}
//新增裝備 打開Modal
function open_add_class_dialog() {
    $('#add_class_dialog').modal('show');
}

//當圍籬設定的Modal打開 做resize
$('#vf-modal').on('shown.bs.modal', function () {
    var area_coord_list =[];
    for(var obj of $("#markInfo").find("input")){
        area_coord_list.push(obj.defaultValue);
    }
    resize(area_coord_list); //canvas responsive
})

//隨畫面解析度變動，更新畫布座標
function resize(area_coord_array) {
    /* area_coord_array, bili_coord 傳入參數皆為轉換後的`百分比`座標 */
    can.width = img.width;
    can.height = img.height;
    can2.width = img.width;
    can2.height = img.height;
    canSave.width = img.width;
    canSave.height = img.height;
    drawArea.clear(); 
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
}

/* 以下為創建/畫線/拉取 虛擬圍籬 */
//計算圍籬比例尺
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


function createXYinfo(coord, img_width, img_height) {
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

    InfoID= $('#markInfo').find('input').length+1;
    var div = document.createElement('div');
    div.id = 'mInfo' + InfoID; div.className = 'input-group mb-3 col-md col-sm-5';
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

// 存储已生成的点线
function canvasSave(pointArr) {
    //            ctxSave.clearRect(0, 0, ctxSave.width, ctxSave.height);
    //            ctxSave.beginPath();
    //            if (pointArr.length > 1) {
    //                ctxSave.moveTo(pointArr[0].x, pointArr[0].y);
    //                for (var i = 1; i < pointArr.length; i++) {
    //                    ctxSave.lineTo(pointArr[i].x, pointArr[i].y);
    //                    ctxSave.fillStyle = 'rgba(161,195,255,0.5)'; //填充颜色
    //                    //ctxSave.fill();
    //                    ctxSave.stroke(); //绘制
    //                }
    //                ctxSave.closePath();
    //            }
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
    polyId = 0; InfoID = 1;

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


/* 前後端處理 */
//儲存 Area圍籬區域
function saveAreaCoord() {
    // $('#vf-modal').modal('hide');
    var fence_enable = $('#switch_fence').prop("checked");
    var canvas = document.getElementById('mapPic');
    w = canvas.width;
    h = canvas.height;
    var areas_points = []

    for (i = 1; i <= $('#markInfo').children().length; i++) {
        coord = document.getElementById('coordInfo' + i);
        points = []
        if (coord == null)
            continue
        if (coord.value != "") {
            coord_list = coord.value.split(' ')
            for (var point of coord_list) {
                if (point != "") {
                    coord_group = point.split(',') 
                    new_coord = [((coord_group[0]/100*w).toFixed(0)) , ((coord_group[1]/100*h).toFixed(0))];
                    points.push(new_coord)
                }
                console.log('point: ' + point)
            }
            areas_points.push(points)
        }
    }

    console.log('areas_points: ' + areas_points)
    var json_data = {
        "fence_enable": fence_enable,
        "img_width": w,
        "img_height": h,
        "area_coord": areas_points,
    }

     // 儲存設定
    if(fence_enable==true && areas_points =='')   //確認啟用狀態要有座標資訊
        Swal.fire({title:"請確認虛擬圍籬！", text: "啟用虛擬圍籬，請記得框選圍籬區域再進行儲存", icon:"warning"})
    else{
        $.ajax({
            type: 'POST',
            async: false,
            url: "/face/save_fence_coord",
            contentType: 'application/json; charset=UTF-8',
            data: JSON.stringify(json_data),
            success: function (result) {
                Swal.fire({ title: result ,icon: 'success',showConfirmButton: false, timer: 1500,toast: true});
                // $('#vf-modal').modal('hide')
            },
            error: function (errorInfo) {
                Swal.fire({ title: "更新失敗, error:" +errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1200,toast: true});
            }
        });
    }
}
