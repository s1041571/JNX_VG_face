/* 前後端 AJAX處理 */

//攝影機切換功能
var select_cam = document.getElementById("Cam_select");
var camid = select_cam.selectedIndex + 1;
$('#Cam_select').on('change', function () {
    camid = select_cam.selectedIndex + 1
    console.log('change cam to ' + camid)
    url = "/change_cam/" + camid
    $.ajax({
        url: url,
        method: 'GET',
        beforeSend: function(){
            Swal.fire({ 
                html:"切換至「" + camid + "號」攝影機<br><b>處理中，請稍後...</b>",
                showConfirmButton: false,
                toast: true,
                didOpen: () => {Swal.showLoading()}
            });
        },
        success: function (res) {
            console.log(res)
            Swal.fire({
                title: "成功切換攝影機",
                text: "已切換至「" + camid + "號」攝影機",
                icon: "success",
                showConfirmButton: false,
                timer: 1200,
            });
        },
        error: function (res) {
            console.log(res)
        }
    })
});

//頁籤切換:切換至(辨識)主頁
$('#mainPage').click(function() {
    $('#alarm-clear-div').show();
    var bili_canvas = document.getElementById('mapPic');
    w = bili_canvas.width;
    h = bili_canvas.height;
    var json = '{"img_width":"' + w + '","img_height":"' + h + '"}'
    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/MainPageOn",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(json),
        success: function (result) {
        },
        error: function (errorInfo) {
            Swal.fire({ title: errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1500,toast: true});
        }
    });
});
$('#monitorPage').click(function() {
    $('#alarm-clear-div').show();
    var bili_canvas = document.getElementById('mapPic');
    w = bili_canvas.width;
    h = bili_canvas.height;
    var json = '{"img_width":"' + w + '","img_height":"' + h + '"}'
    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/MainPageOn",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(json),
        success: function (result) {
        },
        error: function (errorInfo) {
            Swal.fire({ title: errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1500,toast: true});
        }
    });
});

//頁籤切換:切換至設定頁 後端設定flag & Canvas Resize
$('#settingPage').click(function () {
    $('#alarm-clear-div').hide();
    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/SettingPageOn",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(1),
        //dataType: 'json', //加入後會有post成功,但未執行success函式 -->因返回是字串而不是物件
        success: function (result) {
        },
        error: function (errorInfo) {
            Swal.fire({ title: "更新失敗, error:" +errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1500,toast: true});
        }
    });
});

//無法納入上方func原因為:當按按鈕時，網頁上圖片尚未載入，因而無法抓到圖片大小
$('#settingPage').on('shown.bs.tab', function (event) {
    var area_coord_list =[];
    for(var obj of $("#markInfo").find("input")){
        area_coord_list.push(obj.defaultValue);
    }
    var bili_coord = $('#lineInfo').val();
    resize(area_coord_list, bili_coord); //canvas responsive
})

//頁籤切換:切換至異常訊息頁 後端設定flag
$('#alarmlogPage').click(function () {
    update_alarm_log_json();
});

$('#log_dt_select').change(function(){
    var selected_item = $('#log_dt_select').find("option:selected").text()
    update_alarm_log_json(selected_item);
    $('#img_review').attr('src','http://fakeimg.pl/1920x1153/?text=File Review');
});

//更新 DataTable資料來源: log_json 
function update_alarm_log_json(selected_item){
    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/AlarmLogPageOn",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(1),
        success: function (result) {
            // var selected_item = $("#log_dt_select").find("option:selected").text()
            if(selected_item == null)
                selected_item = Object.keys(result)[Object.keys(result).length-1]
            var data = []
            var index = 0
            $("#log_dt_select option").remove();

            Object.keys(result).forEach(function(key) {
                $("#log_dt_select").append($('<option>', {
                    value: key,
                    text: key
                }));

                $(`#log_dt_select option[value=${selected_item}]`).attr('selected','selected');
                
                if(key == selected_item){
                    result[key].forEach(function(item_dict) {
                        // item_dict['img'] = `<a href="/show_img/alarm_msg/${item_dict['img'].replace('.jpg','')}" target="_blank">
                        // <button class="btn btn-md btn-outline-primary">
                        //     打開圖片<i class="fas fa-image"></i>
                        // </button></a>`
                        item_dict['weight'] = item_dict['weight'].replace('.pt','')
                        item_dict['img'] = ` <button class="btn btn-outline-primary btn-sm" onclick="review_imgfile('${item_dict['img'].replace('.jpg','')}')">
                            預覽圖片<i class="fas fa-image"></i>
                        </button>`
                    });
                    data = result[key]
                }
                index++;
            
            });
            $('#alarm_log_table').bootstrapTable('destroy')
            $('#alarm_log_table').bootstrapTable({data: data});

        },
        error: function (errorInfo) {
            Swal.fire({ title: "更新失敗, error:" +errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1500,toast: true});
        }
    });
}

//頁籤切換(設定內容頁): 切換至設定頁時,優先切回即時影像狀況
function setPage_Tabs_Switch() {
    viewFlag = 0;
    var btn = document.getElementById('changeSetView');
    var btn_scr = document.getElementById('screenshot');
    var pic = document.getElementById('mapPic');
    btn.innerHTML = "<i class='fas fa-exchange-alt'></i>&nbsp;影像切換 (過往)";
    btn_scr.disabled = false;
    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/SettingPageOn",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(1),
        success: function (result) {
        },
        error: function (errorInfo) {
            Swal.fire({ title: "失敗, error:" +errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1200,toast: true});
        }
    });
}

//頁籤切換(設定內容頁): 圍籬區域tab
$("#areaSetPage").click(function () {
    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/SettingTabsSwitch",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify('1'),
        success: function (result) {
        },
        error: function (errorInfo) {
            Swal.fire({ title: "更新失敗, error:" +errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1200,toast: true});
        }
    });
    var ui = document.getElementById("markArea");
    var svgA = document.getElementById('svgArea');
    var svgB = document.getElementById('svgBili');
    can2.style.display = "none";
    can.style.display = "";
    svgA.style.display = "";
    svgB.style.display = "none";
});

//頁籤切換(設定內容頁): 比例尺tab
$("#biliSetPage").click(function () {
    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/SettingTabsSwitch",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify('2'),
        success: function (result) {
        },
        error: function (errorInfo) {
            Swal.fire({ title: "更新失敗, error:" +errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1200,toast: true});
        }
    });
    var ui = document.getElementById("markArea");
    var svgA = document.getElementById('svgArea');
    var svgB = document.getElementById('svgBili');
    can.style.display = "none";
    can2.style.display = "";
    svgA.style.display = "none";
    svgB.style.display = "";
});

//截圖功能
function screenshot(mode) {
    //先截圖
    $.ajax({
        type: 'POST',
        async: false,
        url: "/screenShot",
        contentType: 'application/json; charset=UTF-8',
        success: function (result) {
        },
        error: function (errorInfo) {
            Swal.fire({ title: "截圖失敗, error:" +errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1200,toast: true});
        }
    });
    //儲存影像
    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/screenShot",
        contentType: 'application/json; charset=UTF-8',
        success: function (result) {
            console.log(result);
            if(result == '1'){
                $('#screenshot').html(`<i class="fas fa-expand"></i> 動態`);
                $('#set_status').html('截圖模式，已儲存當前影像');
                $('#changeSetView').attr('disabled', true);
            }
            else{
                $('#screenshot').html(`<i class="fas fa-expand"></i> 截圖`);
                $('#set_status').html('即時影像模式');
                $('#changeSetView').attr('disabled', false);
            }
        },
        error: function (errorInfo) {
            Swal.fire({ title: "截圖失敗, error:" +errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1200,toast: true});
        }
    });
}

//設定頁 即時&過往影像 img來源切換
function loadSetView() {
    var json = 0;
    var pic = document.getElementById('mapPic');
    var btn = document.getElementById('changeSetView');
    var btn_scr = document.getElementById('screenshot');
    var str = location.href;

    if (viewFlag == 0) {
        viewFlag = 1
        json = 1
        btn.innerHTML = "<i class='fas fa-exchange-alt'></i>&nbsp;影像切換 (即時)";
        btn_scr.disabled = true;
        $('#set_status').html('過往儲存影像');
    }
    else {
        viewFlag = 0
        json = 0
        btn.innerHTML = "<i class='fas fa-exchange-alt'></i>&nbsp;影像切換 (過往)";
        btn_scr.disabled = false;
        $('#set_status').html('即時影像模式');
    }

    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/getHistoryPic",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(json),
        success: function (result) {
        },
        error: function (errorInfo) {
            Swal.fire({ title: "失敗, error:" +errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1200,toast: true});
        }
    });

}

//變更模型選單(選項)，向後端要取`模型類別`資料
function weights_change(option) {
    var selected_option = $('#weights_list').val();
    console.log(selected_option);
    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/selectListChange",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(selected_option),
        dataType: "json",
        success: function (result) {
            class_list = result;
            $('#class_list').multiselect('destroy');
            $('#class_list').empty();
            class_list.forEach(item => {
                $('#class_list').append($('<option>', {
                    value: item,
                    text: item
                })
                )
            });
            $('#class_list').multiselect({
                maxHeight: 200,
                includeSelectAllOption: true,
            });
        },
        error: function (errorInfo) {
            Swal.fire({ title: "失敗, error:" +errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1200,toast: true});
        }
    });
}

//儲存 距離警報標準設定值
function saveAlarmDist(mode) {
    let level_array = [];
    if ($('#input_log_save_day')=="" || $('.level1_input').val() == "" || $('.level2_input').val() == "" || $('.level3_input').val() == "") {
        Swal.fire({ title: "請輸入數值!" ,icon: 'warning',showConfirmButton: false, timer: 1200,toast: true});
    }
    else {
        level_array.push($('.level1_input').val());
        level_array.push($('.level2_input').val());
        level_array.push($('.level3_input').val());
        var json = {
            mode: mode,
            items: {
                "log": {
                    "save_day": parseInt($('#input_log_save_day').val())
                },
                "level": level_array
            }
        }
        $.ajax({
            type: 'POST',
            async: false,
            url: "/Distance/saveAlarmSetting",
            contentType: 'application/json; charset=UTF-8',
            data: JSON.stringify(json),
            success: function (result) {
                // Swal.fire({ title: result ,icon: 'success',showConfirmButton: false, timer: 1500,toast: true});
                $('#alarmdist_label_v1').html($('.level1_input').val());
                $('#alarmdist_label_v2').html($('.level2_input').val());
                $('#alarmdist_label_v3').html($('.level3_input').val());
                Swal.fire({ title: result ,icon: 'success',showConfirmButton: false, timer: 1500,toast: true});
            },
            error: function (errorInfo) {
                Swal.fire({ title: "更新失敗, error:" + errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1200,toast: true});
            }
        });

    }
}

//儲存 物件警報設定值
function saveAlarmObjSetting(mode){
    var fieldBlank = false;
    $("#alarmSet .form-control.text-center").each( function(index, element){
        // 代表欄位為空
        if(element['value'].length == 0){ 
            fieldBlank = true;
            Swal.fire({ title: "欄位不能為空白", icon: 'error', showConfirmButton: false, timer: 1500, toast: true});
            return false;
        }
    });
    
    if(!fieldBlank){
        var json = {
            mode: mode,
            items: {
                "alarm_threhold": {
                    "obj_max_count": parseInt($('#input_alarmObjNum').val()),
                    "total_frame":parseInt($('#input_alarmTotalFrame').val()),
                    "ng_frame": parseInt($('#input_alarmNgFrame').val())
                },
                "log":{
                    "save_day": parseInt($('#input_log_save_day').val())
                }
            }
        }
        
        $.ajax({
            type: 'POST',
            async: false,
            url: "/Distance/saveAlarmSetting",
            contentType: 'application/json; charset=UTF-8',
            data: JSON.stringify(json),
            success: function (result) {
                Swal.fire({ title: result ,icon: 'success',showConfirmButton: false, timer: 1500,toast: true});
                $('#info_alarmObjNum').html($('#input_alarmObjNum').val());
            },
            error: function (errorInfo) {
                Swal.fire({ title: "更新失敗, error:" + errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1200,toast: true});
            }
        });
    }
   
}

//儲存 通報頻道資訊
function saveAlarmGroup(mode){
    var channel_list = [];
    var mailGroup ="";
    if($("#check_mail").prop("checked") == true) {
        if($('#mailGroupSelect')[0].selectedIndex == 0)
            Swal.fire({ title: "請記得選取收件者群組！" ,icon: 'info',showConfirmButton: false, timer: 1500,toast: true});
        else{
            channel_list.push("mail");
            mailGroup = $('#mailGroupSelect').val();
        }
    }
    if($("#check_link").prop("checked") == true){
        channel_list.push("link");
    }
    if($("#check_line").prop("checked") == true){
        channel_list.push("line");
    }
    // if($("#check_estone").prop("checked") == true){
    //     channel_list.push("estone");
    // }
    var json = {
        mode: mode,
        items: {
            "alarm_threhold": {
                "obj_max_count": parseInt($('#input_alarmObjNum').val()),
                "total_frame":parseInt($('#input_alarmTotalFrame').val()),
                "ng_frame": parseInt($('#input_alarmNgFrame').val())
            },
            "log":{
                "save_day": parseInt($('#input_log_save_day').val())
            },
            "channel" : {
                "channel": channel_list,
                "mail_group" : mailGroup
            }
        }
    }

    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/saveAlarmSetting",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(json),
        success: function (result) {
            Swal.fire({ title: result ,icon: 'success',showConfirmButton: false, timer: 1500});
        },
        error: function (errorInfo) {
            Swal.fire({ title: "更新失敗, error:" + errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1200,toast: true});
        }
    });
            
}

//儲存 Area圍籬區域
function saveAreaCoord() {
    var bili_canvas = document.getElementById('mapPic');
    w = bili_canvas.width;
    h = bili_canvas.height;
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
        "img_width": w,
        "img_height": h,
        "area_coord": areas_points,
    }
    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/saveAreaCoord",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(json_data),
        success: function (result) {
            Swal.fire({ title: result ,icon: 'success',showConfirmButton: false, timer: 1500,toast: true});
        },
        error: function (errorInfo) {
            Swal.fire({ title: "更新失敗, error:" +errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1200,toast: true});
        }
    });
}

//儲存 Bili比例尺
function saveBili() {
    var bili_canvas = document.getElementById('mapPic');
    w = bili_canvas.width;
    h = bili_canvas.height;
    b = $('#result_bili').val();
    b_coord = $('#lineInfo').val();
    var new_b_coord = '';
    coord_list = b_coord.split(' ')
    for (var coord_group of coord_list) {
        if(coord_group=="") continue
        else{
            coord = coord_group.split(',') 
            new_b_coord += ((coord[0]/100*w).toFixed(0)) +','+((coord[1]/100*h).toFixed(0)) +' ';
        }
    }
    var json = '{"bili":"' + b + '","coord":"' + new_b_coord + '","img_width":"' + w + '","img_height":"' + h + '"}'
    $.ajax({
        type: 'POST',
        async: false,
        url: "/Distance/saveBili",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(json),
        success: function (result) {
            Swal.fire({ title: result ,icon: 'success',showConfirmButton: false, timer: 1500,toast: true});
            $('#info_bili').html(b);
        },
        error: function (errorInfo) {
            Swal.fire({ title: errorInfo.message ,icon: 'error',showConfirmButton: false, timer: 1200,toast: true});
        }
    });
}


// 警報清除按鈕
$("#alarm-clear-div").click(function () {
    // $('.btn-alarmclear').fadeOut(300);
    $.ajax({
      type: 'POST',
      async: false,
      contentType: 'application/json; charset=UTF-8',
      url: "/Distance/alarm_clear",
      success: function (res) {
        Swal.fire({ 
          title:"已清除警報！！",
          icon:'success',
          timer:1500,
          toast: true,
          showConfirmButton: false,
        });
      },
      error: function(res){
        Swal.fire({ 
          title:"執行失敗...",
          icon:'error',
          timer:1500,
          toast: true,
          showConfirmButton: false,
        });
      }
    });
    
});
