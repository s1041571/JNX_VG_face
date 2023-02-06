$('#logout_Btn').click(function () {
    $.ajax({
        type: 'POST',
        async: false,
        url: "/logout",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify('1'),
        success: function (result) {
        Swal.fire({
            title: "登出成功",
            text: "保持良好的登出習慣~",
            icon: "success",
            showConfirmButton: false,
            timer: 1200,
        });
        setTimeout(function () {
            location.reload();
        }, 1500);
        },
        error: function (errorInfo) {
        swal("登出失敗, 異常error:請聯絡系統開發窗口協助");
        }
    });

});
//table 新增成員
function insertRow(TeamName){
    var rowData='' ;
    Swal.fire({
        title: '請輸入收件者名稱與信箱',
        input: 'email',
        inputPlaceholder: '你的信箱',
        html:
            '<input type="text" class="form-control mx-1 swal-input" id="swal-input-name" placeholder="你的名稱">' ,
        showCancelButton: true,
        preConfirm: (value) => {
            return [
                $('#swal-input-name').val(),
                value
            ]
        }
    }).then((result) =>{
        if (result.value[0]!='' && result.value[1]!='') {
            var counter = $(`#mail-table-${TeamName} >tbody >tr:not(.no-records-found)`).length +1;
            rowData={
                index: counter,
                row:{
                    id: counter,
                    name: result.value[0] ,
                    mail: result.value[1] ,
                    edit: `<a class="text-danger" onclick="delMember(this)"><i class="far fa-trash-alt"></i></a>`
                }
            }
            $(`#mail-table-${TeamName}`).bootstrapTable('insertRow', rowData);
            $(`#mail-panel-${TeamName}`).find('.badge').html(counter);
            Swal.fire({title:'新建成功！',icon:'success',timer:1500, showConfirmButton: false , toast:true})
        }
        else{
            Swal.fire({title:'請勿輸入空值...',icon:'error',timer:1500, showConfirmButton: false , toast:true})
        }
    });

}

//table 刪除成員
// $("table").on("click", "#delRow", function (event) {
//     Swal.fire({
//         title: '刪除確認',
//         text: '確定要刪除此筆資料？',
//         showCancelButton: true,
//         showConfirmButton:true,
//         icon:'warning'
//     }).then((result) =>{
//         if(result.isConfirmed)
//         {
//             var TeamName = $(this).closest('.mail-panel').find('#mail-group-name').html()
//             var index = $(this).closest("tr").index();
//             $(`#mail-table-${TeamName}`).bootstrapTable('remove', {field: '$index', values: [index]});
//             var counter = $(`#mail-table-${TeamName} >tbody >tr:not(.no-records-found)`).length;
//             $(`#mail-panel-${TeamName}`).find('.badge').html(counter);
//         }
//     });
    
// });
function delMember(obj){
    Swal.fire({
        title: '刪除確認',
        text: '確定要刪除此筆資料？',
        showCancelButton: true,
        showConfirmButton:true,
        icon:'warning'
    }).then((result) =>{
        if(result.isConfirmed)
        {
            var TeamName = $(obj).closest('.mail-panel').find('#mail-group-name').html()
            var index = $(obj).closest("tr").index();
            $(`#mail-table-${TeamName}`).bootstrapTable('remove', {field: '$index', values: [index]});
            var counter = $(`#mail-table-${TeamName} >tbody >tr:not(.no-records-found)`).length;
            $(`#mail-panel-${TeamName}`).find('.badge').html(counter);
        }
    });
}

//重新命名群組名稱
function renameGroup(obj){
    Swal.fire({
        title: '重新命名群組',
        input: 'text',
        inputLabel: '請輸入新的群組名稱',
        showCancelButton: true,
        inputPlaceholder: 'Enter your group name',
        inputValidator: (value) => {
            if (!value) {
                return '勿填空，請輸入名稱!'
            }
        }
    }).then((new_name) =>{
        if (new_name.value) {
            var json_data={
                item:'rename_mail_group',
                group_name:  $(obj).closest('.mail-panel').find('#mail-group-name').html(),
                group_new_name:new_name.value
            }
            $.ajax({
                type: 'POST',
                async: false,
                url: "/crud_gb_setting",
                contentType: 'application/json; charset=UTF-8',
                data: JSON.stringify(json_data),
                success: function(result) {
                    if(result == 'success'){
                        Swal.fire({title:'修改成功！',icon:'success',timer:1500, showConfirmButton: false})
                        $(obj).closest('.mail-panel').find('#mail-group-name').html(new_name.value)
                    }
                    else if(result == 'fail')
                        Swal.fire({title:'變更出錯失敗...',icon:'error',timer:1200, showConfirmButton: false , toast:true})
                    else
                        Swal.fire({title:'執行結果',text:result, icon:'info' ,showConfirmButton: true})
                },
                error: function(e) {
                    Swal.fire({title:'執行失敗',text:e, icon:'error' ,showConfirmButton: true, toast:true})
                }
            });
        }
    })
}

// $(".mail-panel").on("click", ".renameGroup", function (event) {
//     Swal.fire({
//         title: '重新命名群組',
//         input: 'text',
//         inputLabel: '請輸入新的群組名稱',
//         showCancelButton: true,
//         inputPlaceholder: 'Enter your group name',
//         inputValidator: (value) => {
//             if (!value) {
//                 return '勿填空，請輸入名稱!'
//             }
//         }
//     }).then((new_name) =>{
//         if (new_name.value) {
//             // $(this).find('#mail-group-name').html(new_name.value);
//             $(this).closest('.mail-panel').find('#mail-group-name').html(new_name.value)
//             Swal.fire({title:'成功修改！',icon:'success',timer:1200, showConfirmButton: false , toast:true})
//         }
//     })

// });

//新建群組
function addMailGroup(){
    var html = "";
    Swal.fire({
        title: '新建群組',
        input: 'text',
        inputLabel: '請輸入群組名稱',
        showCancelButton: true,
        inputPlaceholder: 'Enter your group name',
        inputValidator: (value) => {
            if (!value) {
                return '勿填空，請輸入名稱!'
            }
        }
    }).then((result) =>{
        if (result.value) {
            var group_name = result.value;
            html +="<div class='panel panel-default mail-panel' id='mail-panel-"+group_name+"'>"
            html +='<div class="row d-flex align-items-stretch">'
            html +='<div class="panel-heading col mr-3">'
            html +='<h4 class="panel-title">'
            html +='<a class="border d-flex justify-content-between" role="button" data-toggle="collapse" data-parent="#accordion" href="#collapseOne" aria-expanded="true">'
            html +="<span id='mail-group-name'>"+group_name+"</span>"
            html +='<span class="mail-group-num">'
            html +='<i class="fas fa-users text-muted mr-1"></i>'
            html +='<span class="badge badge-warning badge-pill">New</span>'
            html +='</span>'
            html +='</a>'
            html +='</h4>'
            html +='</div>'
            html +='<span class="py-3 mail-edit-btn text-primary">'
            html +='<a onclick="renameGroup(this)" data-toggle="tooltip" data-placement="top" title="重新命名群組">'
            html +='<i class="fas fa-pen"></i>'
            html +='</a>'
            html +=`<a onclick="insertRow('${group_name}')" data-toggle='tooltip' data-placement='top' title='新增使用者'>`
            html +='<i class="fas fa-plus"></i>'
            html +='</a>'
            html +=`<a onclick="delGroup('${group_name}')" data-toggle='tooltip' data-placement='top' title='刪除群組'>`
            html +='<i class="far fa-trash-alt"></i>'
            html +='</a>'
            html +='</span>'
            html +='<div id="collapseOne" class="col-11 panel-collapse collapse show">'
            html +='<div class="panel-body px-0">'
            html +="<table id='mail-table-"+group_name+"' class='text-center' data-toggle='table'>"
            html +='<thead>'
            html +='<tr>'
            html +='<th data-field="id" data-visible="false">ID</th>'
            html +='<th data-field="name">UserName</th>'
            html +='<th data-field="mail">Email</th>'
            html +='<th data-field="edit">Edit</th>'
            html +='</tr>'
            html +='</thead>'
            html +='<tbody>'
            html +='</tbody>'
            html +='</table>'
            html +='<button class="btn btn-success my-2 float-right" onclick="saveTableData(this)"><i class="bi bi-check-all"></i>儲存變更</button>'
            html +='</div>'
            html +='</div>'
            html +='</div>'
            html +='</div>'
            $(".panel-group").append(html);
            $(`#mail-table-${group_name}`).bootstrapTable();
            Swal.fire({title:'新建成功！',icon:'success',timer:1500, showConfirmButton: false})
        }
    })
}

//刪除群組
function delGroup(TeamName){
    Swal.fire({
        title:'刪除群組',
        text:`確定要刪除這個群組?`,
        icon:'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Delete'
    }).then((result) => {
        if (result.isConfirmed) {
            if($('#v-pills-email').hasClass('active')){
                
                // Swal.fire({title:'刪除成功！',icon:'success',timer:1200, showConfirmButton: false , toast:true})
                var json_data = {
                    item:'del_mail_group',
                    group:TeamName
                }
                $.ajax({
                    type: 'POST',
                    async: false,
                    url: "/crud_gb_setting",
                    contentType: 'application/json; charset=UTF-8',
                    data: JSON.stringify(json_data),
                    success: function(result) {
                        if(result == 'success'){
                            $(`#mail-panel-${TeamName}`).remove();
                            Swal.fire({title:'刪除成功！',icon:'success',timer:1500, showConfirmButton: false})
                        }
                        else if(result == 'fail')
                            Swal.fire({title:'刪除失敗...',icon:'error',timer:1200, showConfirmButton: false , toast:true})
                        else
                            Swal.fire({title:'執行結果',text:result, icon:'info' ,showConfirmButton: true})

                    },
                    error: function(e) {
                        console.log(e)
                    }
                });
            }
            else if($('#v-pills-line').hasClass('active'))
            {}
        }
    });      
}

//table 儲存變更(群組資料)
// $(".panel-body").on("click", "#saveTableData", function (event) {
//     var table = $(this).parent().find('table')[1];
//     var data = $(table).bootstrapTable('getData');
//     var new_data = [];
//     data.forEach((item, index) => {
//         var json = {
//             id: index+1,
//             name: item['name'],
//             mail:item['mail']
//         }
//         new_data.push(json);
//     });
//     console.log(JSON.stringify(new_data));
//     var group_name = $(this).closest('.mail-panel').find('#mail-group-name').html()
//     var json_data = {
//         item: 'upd_mail_group',
//         group: group_name,
//         member: new_data
//     }
//     $.ajax({
//         type: 'POST',
//         async: false,
//         url: "/crud_gb_setting",
//         contentType: 'application/json; charset=UTF-8',
//         data: JSON.stringify(json_data),
//         success: function(result) {
//             if(result == 'success')
//                 Swal.fire({title:'儲存成功！',icon:'success',timer:1500, showConfirmButton: false , toast:true})
//             else
//                 Swal.fire({title:'儲存失敗...',icon:'success',timer:1200, showConfirmButton: false , toast:true})
//         },
//         error: function(e) {
//             console.log(e)
//         }
//     });
// });

function saveTableData(obj){
    var table = $(obj).parent().find('table')[1];
    var data = $(table).bootstrapTable('getData');
    var new_data = [];
    data.forEach((item, index) => {
        var json = {
            id: index+1,
            name: item['name'],
            mail:item['mail']
        }
        new_data.push(json);
    });
    console.log(JSON.stringify(new_data));
    var group_name = $(obj).closest('.mail-panel').find('#mail-group-name').html()
    var json_data = {
        item: 'upd_mail_group',
        group: group_name,
        member: new_data
    }
    $.ajax({
        type: 'POST',
        async: false,
        url: "/crud_gb_setting",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(json_data),
        success: function(result) {
            if(result == 'success')
                Swal.fire({title:'儲存成功！',icon:'success',timer:1500, showConfirmButton: false })
            else
                Swal.fire({title:'儲存失敗...',icon:'error',timer:1200, showConfirmButton: false , toast:true})
        },
        error: function(e) {
            console.log(e)
        }
    });
}

function openModal(obj, modal){
    $(`#${modal}`).modal('show');
    
    if(modal=='CamEditModal'){
        var Row = obj.parentNode;
        $('#edit_camid').val(Row.parentElement.cells[0].innerHTML);
        $('#edit_site').val(Row.parentElement.cells[1].innerHTML);
        $('#edit_camip').val(Row.parentElement.cells[2].innerHTML);
        $('#cam_updateBtn').attr('onclick',`updateRow('cam_table',${Row.parentElement.rowIndex})`)
    }
    if(modal=='AdminEditModal'){
        var Row = obj.parentNode;
        $('#edit_password').val(Row.parentElement.cells[1].innerHTML);
        $('#admin_updateBtn').attr('onclick',`updateRow('admin_table',${Row.parentElement.rowIndex})`)
    }
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

function saveTable(table) { //tableid是你要轉化的表的表名,是一個字串,如"example" 
    var json = JSON.stringify($(`#${table}`).bootstrapTable('getData'));
    if(table=="cam_table"){
        $.ajax({
            type: 'POST',
            async: false,
            url: "/save_cam_config",
            contentType: 'application/json; charset=UTF-8',
            data: json,
            success: function (result) {
                Swal.fire({
                    title: result,
                    icon:'success',
                    showCancelButton: false,
                    timer:1500
                })
            },
            error: function (errorInfo) {
                Swal.fire({
                    title: '更新失敗',
                    text: "Error:" + errorInfo.message,
                    icon:'error',
                    showCancelButton: false,
                    timer:1500
                })
            }
        });
    }
    else if(table=="admin_table"){
        json  = JSON.parse(json)
        var json_data = {
            item: 'upd_admin_dict',
            data: json,
        }
        
        $.ajax({
            type: 'POST',
            async: false,
            url: "/crud_gb_setting",
            contentType: 'application/json; charset=UTF-8',
            data: JSON.stringify(json_data),
            success: function (result) {
                Swal.fire({
                    title: '儲存成功',
                    text: '權限者帳號資訊儲存成功',
                    icon:'success',
                    showCancelButton: false,
                    timer:1500
                })
            },
            error: function (errorInfo) {
                Swal.fire({
                    title: '更新失敗',
                    text: "Error:" + errorInfo.message,
                    icon:'error',
                    showCancelButton: false,
                    timer:1500
                })
            }
        });
    }
    
}

function delRow(obj, table) {
    var Row = obj.parentNode; //tr

    Swal.fire({
        title:'刪除確認',
        text:`確定要刪除此行?`,
        icon:'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Delete'
    }).then((result) => {
        if (result.isConfirmed) {
            //刪除行
            if($(`#${table}>tbody > tr`).length>1){
                $(`#${table}`).bootstrapTable('remove', {
                    field: '$index',
                    values: [Row.parentElement.rowIndex-1]
                })
            }
            else{
                Swal.fire({
                    title:'刪除失敗',
                    text: `至少須保有一筆資料，因此無法進行刪除！`,
                    icon:'warning'
                });
            }

            if(table=="cam_table"){
                //更新table camid
                for(i=0; i<=$(`#${table}>tbody > tr`).length; i++){
                    $(`#${table}`).bootstrapTable('updateRow', {
                        index: i,
                        row: {
                        id: i+1,
                        }
                    })
                }
            }
        }
    });
}

function createNewRow(table) {
    var rowNum = document.getElementById(table).rows.length; //表格當前的行數
    // var tr = document.createElement('tr');
    // tr.id = 'row' + (rowNum + 1);
    // $(`#${table} > tbody`).append(tr);

    // var td = document.getElementById('row' + (rowNum + 1));

    var objHTML = "";
    if(table=='cam_table'){
        $(`#${table}`).bootstrapTable('insertRow', {
            index: rowNum,
            row: {
                id: rowNum,
                site: "",
                ip: "",
                edit: `<button class="btn btn-secondary" id="updateBtn" onclick="openModal(this,'CamEditModal')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-danger" id="deleteBtn" onclick="delRow(this,'${table}')"><i class="far fa-trash-alt"></i></button>`
            }
        });
    }
    else if(table=="admin_table"){
        Swal.fire({
            title:'新增權限帳號',
            inputPlaceholder:`Enter Your Account ID`,
            icon:'info',
            input: 'text',
            showCancelButton: true,
        }).then((id_result) => {
            if (id_result.isConfirmed) {
                Swal.fire({
                    title:'輸入密碼',
                    inputPlaceholder:`Enter Your Password`,
                    icon:'info',
                    input: 'password',
                    showCancelButton: true,
                }).then((pw_result) => {
                    if (pw_result.isConfirmed) {
                        $(`#${table}`).bootstrapTable('insertRow', {
                            index: rowNum,
                            row: {
                                id: id_result.value,
                                password: pw_result.value,
                                edit: `<button class="btn btn-secondary" id="updateBtn" onclick="openModal(this,'AdminEditModal')"><i class="bi bi-pencil"></i></button>
                                <button class="btn btn-danger" id="deleteBtn" onclick="delRow(this,'${table}')"><i class="far fa-trash-alt"></i></button>`
                            }
                        });
                    }
                });
                
            }
        });
    }
   
}

function updateRow(table, row_index) {
    if(table=='cam_table'){
        $(`#${table}`).bootstrapTable('updateRow', {
            index: row_index-1,
            row: {
              id: $('#edit_camid').val(),
              site: $('#edit_site').val(),
              ip: $('#edit_camip').val()
            }
        })
        $('#CamEditModal').modal('hide');
    }
    else if(table=='admin_table'){
        $(`#${table}`).bootstrapTable('updateRow', {
            index: row_index-1,
            row: {
              password: $('#edit_password').val(),
            }
        })
        $('#AdminEditModal').modal('hide');
    }
    
}

function save_link_setting(){
    var systemCode = $('#input_link_systemCode').val();
    var subCateNo = $('#input_link_subCateNo').val();
    var json_data = {
        item: 'upd_link_set',
        systemCode: systemCode,
        subCateNo: subCateNo
    }
    
    $.ajax({
        type: 'POST',
        async: false,
        url: "/crud_gb_setting",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(json_data),
        success: function (result) {
            Swal.fire({
                title: '儲存成功',
                text: 'Link設定儲存成功',
                icon:'success',
                showCancelButton: false,
                timer:1500
            })
        },
        error: function (errorInfo) {
            Swal.fire({
                title: '更新失敗',
                text: "Error:" + errorInfo.message,
                icon:'error',
                showCancelButton: false,
                timer:1500
            })
        }
    });
}

function save_line_setting(){
    var token = $('#input_line_token').val();
    var json_data = {
        item: 'upd_line_set',
        token: token,
    }
    
    $.ajax({
        type: 'POST',
        async: false,
        url: "/crud_gb_setting",
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(json_data),
        success: function (result) {
            Swal.fire({
                title: '儲存成功',
                text: 'LINE設定儲存成功',
                icon:'success',
                showCancelButton: false,
                timer:1500
            })
        },
        error: function (errorInfo) {
            Swal.fire({
                title: '更新失敗',
                text: "Error:" + errorInfo.message,
                icon:'error',
                showCancelButton: false,
                timer:1500
            })
        }
    });
}