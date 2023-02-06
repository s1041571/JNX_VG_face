/* 全域變數 */
var $use_pose_list = []
var $use_pose_table = $('#use_pose_table')
var select_recipe = document.getElementById("select_recipe")
var select_cam = document.getElementById("select_cam")
var recipe = select_recipe.options[select_recipe.selectedIndex].text
var camid = select_cam.selectedIndex + 1
var timer_get_current_pose = null
var pose_label = document.getElementById("current_pose")
var is_start = false
var check_pose_list = []

$(document).ready(function () {
    $('#use_pose_list').bootstrapTable();
    $('[data-toggle="tooltip"]').tooltip();
    $('.frame').width(window.screen.availWidth*0.75);
    $('.frame').height($(window).height()*0.95);
    $('.cycle-border').hide();
    $('#current_pose_tooltip').hide();
    console.log('document ready...')
});

$(window).resize(function () {
    $('.frame').width(window.screen.availWidth*0.75);
    $('.frame').height($(window).height()*0.95);
});

$("#ModalBtn").click(function () {
    $('#exampleModal').modal('show');
});

$("#exampleModal .modal_close").click(function () { $('#exampleModal').modal('hide'); });

function claer() {
    $.ajax({
        type: 'POST',
        async: false,
        url: "/clearRecord",
        contentType: 'application/json; charset=UTF-8',
        // data: JSON.stringify(user),
        success: function (result) {
        alert(result);
        },
        error: function (errorInfo) {
        alert("失敗, 請注意欄位資料是否都有填寫");
        }
    });
}

function setting_change() {
    var frame_num = $('#frame_num_set').val();
    var pred_time = $('#pred_time_set').val();
    $.ajax({
        type: 'POST',
        async: false,
        url: "/Login_Setting_Change",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(frame_num + ',' + pred_time),
        success: function (result) {
        alert(result);
        $('#exampleModal').modal('hide');

        },
        error: function (errorInfo) {
        alert("失敗, error:" + errorInfo.message);
        }
    });
}

var rowMaxNum = 10;
function createNewRow(name, time) {
    if ($('#in_out_table tr').length >= 20) {
        $("#in_out_table tr:first-child").remove();
        $("#in_out_table tr:first-child").remove();
        if (rowMaxNum == 0)
        rowMaxNum = 10;
    }

    for (i = 0; i < 2; i++) {
        var num = document.getElementById("in_out_table").rows.length; //表格當前的行數
        var rowNum = num;
        var tr = document.createElement('tr');
        var objHTML = "";

        if (i == 0) {
        tr.id = 'row_' + rowMaxNum.toString();
        document.getElementById("InfoTable").appendChild(tr);
        var td = document.getElementById('row_' + rowMaxNum.toString());
        objHTML += "<td id='rankid1' rowspan='2'><img src='/show/" + name + "' class='rounded-circle' width='60' height='60'></td>";
        objHTML += "<td class='center' id='rankid1'><b>" + name + "</b></td>";

        }
        else {
        tr.id = 'row2_' + rowMaxNum.toString();
        document.getElementById("InfoTable").appendChild(tr);
        var td = document.getElementById('row2_' + rowMaxNum.toString());
        objHTML += "<td class='pl-2 center text-black-50' id='rankPC1' style='font-size: 13px;'>" + time + "</td>";

        }

        td.innerHTML = objHTML;

    }
    rowMaxNum--;
}