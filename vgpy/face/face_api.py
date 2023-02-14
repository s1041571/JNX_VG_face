import json
import time
from heapq import nlargest

from multiprocessing import Process
from datetime import datetime
from flask import Blueprint, request, render_template, Response, redirect, url_for, jsonify
from flask_login import current_user, login_required, logout_user

from . import face_backend as fbackend
from .face_backend import FaceDetectorTool
from ..global_object import StreamingQueues, GlobalVar
from ..global_function import get_administrator_dict
from enum import Enum, auto
import cv2
import numpy as np
# import Jetson.GPIO as GPIO

from vgpy.face.config.ObjectManager import DetectionManger
from ..yolov5.detect_face_to_yolotxt import detect_face2yolotxt
from vgpy.utils.logger import create_logger
logger = create_logger()

# 人臉辨識的 process 會用到的狀態等
class FaceVar:
    class SIGNAL(Enum):
        CLICK_LOGIN = auto()
        CLICK_RELOAD = auto()
        CLICK_CHANGE_SETTING = auto()
        RELOAD_FRATURE = auto()
        UNLOCK_DOOR = auto()
        UPDATE_FENCE = auto()
        

    def __init__(self):
        """
        @attr
            face_identify_result: 有四種值 ("Fail", "Timeout", {{人名}}, None)
                Fail: 辨識後不在 Enter_List.txt
                {{人名}}: 辨識後存在 Enter_List.txt，為該人臉的名稱
                Timeout: 辨識時間超過設定值
                None: 尚未有辨識結果
            face_landmark_img: 臉部特徵點影像
            model_train_result: 模型訓練結果
            io_status: GPIO 辨識控制的電位狀態
        """
        self.face_identify_result = None
        self.face_landmark_img = None
        self.model_train_result = None
        self.fence_setting  = (fbackend.get_fence_enable(), fbackend.get_cam_areas())
        self.io_status = None
        
    def update(self, facevar):
        self.face_identify_result = facevar.face_identify_result
        self.face_landmark_img = facevar.face_landmark_img

    def build_detection_var_object(cls):
        from vgpy.global_object import DetectionVar
        return DetectionVar()

### 人臉全域變數
identify_default_time = 15
frame_default_number = 20
# GPIO控制 辨識&開門 (製造展用)
pred_pin = 21   # 進行人臉辨識
cancel_pin = 22 # 取消辨識
# GPIO.setmode(GPIO.BOARD)
# GPIO.setup(pred_pin, GPIO.IN) 
# GPIO.setup(cancel_pin, GPIO.IN) 

class FaceMain:
    def __init__(self, q:StreamingQueues, facevar:FaceVar, globalvar:GlobalVar) -> None:
        self.streaming_queues = q
        self.facevar = facevar
        self.globalvar = globalvar
        self.faceTool = FaceDetectorTool(q, globalvar, facevar)

    def __model_train_and_update(self):
        res = fbackend.face_model_train()
        # res = fbackend.face_model_train_old()      
        self.facevar.model_train_result = res.split(',')
        # self.streaming_queues.c_queue.put(FaceVar.SIGNAL.RELOAD_FRATURE) # 訓練後要更新 新的 Feature進去
        self.faceTool.init_detector_object()
        # return result

    def face_app_init(self):
        app_face = Blueprint('face', __name__)
        q = self.streaming_queues
        facevar = self.facevar
        globalvar = self.globalvar
        
        ##############################################################################
        # get face detection result
        @app_face.route("/get_result", methods=['GET'])
        def get_result():
            detectionObject = DetectionManger.get_detectionVar_object()
            return json.dumps(detectionObject.resultInfo) 

        ##############################################################################

        @app_face.route('/index', methods=['GET', 'POST'])  # 使用者登入主頁
        def facial():
            return redirect(url_for('face.facial_login'))
        
        #變更辨識預設值
        @app_face.route("/Login_Setting_Change",methods=['POST'])
        def Login_Setting_Change():
            global identify_default_time
            global frame_default_number
            data = request.get_json()
            data_arr = data.split(',')
            identify_default_time = int(data_arr[1])
            frame_default_number = int(data_arr[0])        
            self.faceTool.set_default_time_and_num(identify_default_time, frame_default_number)
            # q.c_queue.put(FaceVar.SIGNAL.CLICK_CHANGE_SETTING)
            # q.c_queue.put((identify_default_time, frame_default_number))
            logger.info('辨識登入門檻值設定變更成功')
            return '變更成功'
        
        #設定虛擬圍籬
        @app_face.route("/save_fence_coord", methods=['POST'])
        def save_fence_coord():
            try:
                area_json = request.get_json()
                fbackend.save_fence_coord(area_json, globalvar.cam_wh)
                facevar.fence_setting = (fbackend.get_fence_enable(), fbackend.get_cam_areas())
                # q.c_queue.put((FaceVar.SIGNAL.UPDATE_FENCE, facevar))
                logger.info('虛擬圍籬設定成功')
                return '成功儲存圍籬區域!'
            except Exception as e:                
                logger.error(f'虛擬圍籬設定失敗, {e}')
                return '儲存圍籬區域失敗'
        
        @app_face.route('/login', methods=['GET', 'POST'])  # 主页
        def facial_login():
            global identify_default_time, frame_default_number
            fence_setting = fbackend.get_canvas_fence_area_str()
            logger.info('進入人臉管制(UI)登入頁')
            return render_template('face_identify.html', cam_data=(globalvar.cam_id, int(globalvar.cam_num)), identify_time=identify_default_time,\
                 identify_frame=frame_default_number, fence_setting=fence_setting)
        
        @app_face.route('/io_login', methods=['GET', 'POST'])  # 主页
        def facial_rc_login():
            global identify_default_time, frame_default_number
            fence_setting = fbackend.get_canvas_fence_area_str()
            logger.info('進入人臉管制(IO)登入頁')
            return render_template('face_identify_io.html', cam_data=(globalvar.cam_id, int(globalvar.cam_num)), identify_time=identify_default_time,\
                 identify_frame=frame_default_number, fence_setting=fence_setting)
        
        # 辨識結果回傳前端
        @app_face.route("/gpio_status",methods=['GET'])
        def get_gpio_status():
            global pred_pin
            '''
            NOTE
                io_status 發送訊號:
                    0: 不動作
                    1: 進行辨識
            '''
            self.facevar.io_status = 0 #GPIO.input(pred_pin)
            return str(self.facevar.io_status)

        # 辨識結果回傳前端
        @app_face.route("/identify_result",methods=['GET'])
        def get_identify_result():
            global cancel_pin
            now_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            result ={
                "result": self.facevar.face_identify_result,
                "time": now_time,
                # "gpio_status": GPIO.input(cancel_pin)
            }
            if self.facevar.face_identify_result:
                self.facevar.face_identify_result = None
            return result

        #臉部特徵即時影像 回傳前端
        @app_face.route('/stream', methods=['GET']) 
        def face_stream():
            def face_stream_generator():
                while True:
                    if type(facevar.face_landmark_img).__module__ == "numpy":
                        (flag, encodedImage) = cv2.imencode(".jpg", facevar.face_landmark_img)
                        if flag:
                            encodedImage = b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + encodedImage.tobytes() + b'\r\n'
                            yield encodedImage   
                         
            return Response(face_stream_generator(), mimetype='multipart/x-mixed-replace; boundary=frame')

        # 人臉註冊頁面
        @app_face.route('/register', methods=['GET', 'POST'])  
        def register():
            if request.method =='POST':
                result = self.__model_train_and_update()
                return render_template('face_register.html', picNum=result[0], sec=result[1])
            fence_coord = fbackend.get_canvas_fence_area_str()
            logger.info('進入人臉註冊頁')
            return render_template('face_register.html', picNum=0, sec=0, fence_coord=fence_coord)
        

        #======================= 模型訓練頁面 (face_model_train.html) ========================#
        # 系統管理員登入後的頁面 (此為後台畫面，可設定進入名單、刪除已訓練人臉、訓練新註冊的人臉)
        @app_face.route('/admin', methods=['GET', 'POST'])  
        @login_required
        def admin():
            users = get_administrator_dict()
            if current_user.is_active: 
                if users[current_user.id]['level'] !=  'both' and users[current_user.id]['level'] !=  'admin':
                    logout_user()
                    return redirect(url_for('face.admin_login'))

            result = None
            # if request.method == 'POST': # 用 POST 代表要訓練模型
            #     name = request.get_json()
            #     # deletefile('/','{}.jpg'.format(name))
            #     result = self.__model_train_and_update()

            # total_training_img_count = 0
            # total_training_seconds = 0
            # if result: # 如果有訓練模型的話，則讀取訓練結果， [總訓練照片數量，總訓練時間(秒)]
            #     total_training_img_count, total_training_seconds = result                 
            
            enter_str = fbackend.get_enter_list_string()
            db_train = fbackend.get_train_img_string()
            db_base = fbackend.get_base_img_string()
            logger.info('進入人臉模型訓練頁')
            return render_template(
                'face_model_train.html',
                train_js=eval(db_train), base_js=db_base, enter_data=enter_str
            )

        # 訓練模型
        @app_face.route("/model_train",methods=['POST'])
        def model_train():
            if request.method == 'POST': # 用 POST 代表要訓練模型
                name = request.get_json()
                logger.info('執行人臉模型訓練')
                self.__model_train_and_update()                
            return "開始訓練",200

        # 訓練結果 回傳前端
        @app_face.route("/train_result",methods=['GET'])
        def get_train_result():
            result = {"train_img_num": None, "train_time": None}
            if self.facevar.model_train_result: # 如果有訓練模型的話，則讀取訓練結果， [總訓練照片數量，總訓練時間(秒)]
                result = self.facevar.model_train_result
                total_training_img_count, total_training_seconds = result[0], result[1]
                result ={
                    "train_img_num": total_training_img_count,
                    "train_time": total_training_seconds
                }
                self.facevar.model_train_result = None
            return result


        #刪除 待訓練集 資料
        @app_face.route("/del_train_user", methods=['POST'])
        def del_train_user():
            try:            
                user_str = request.get_json()
                remove_user_list = user_str.split(',')
                return fbackend.delete_train_img(remove_user_list)
            except Exception as e:
                logger.error(f'待訓練的人臉照片資料 刪除失敗, {e}')
                return '刪除失敗'

        #刪除 已訓練集 資料
        @app_face.route("/del_base_user", methods=['POST'])
        def del_base_user():
            try:
                user_str = request.get_json()
                remove_baseuser_list = user_str.split(',')

                new_features = fbackend.delete_base_img(remove_baseuser_list)
                print(new_features[0][1])
                # q.c_queue.put(FaceVar.SIGNAL.RELOAD_FRATURE) # 讓辨識人臉的 process 更新成新的 feature
                self.faceTool.init_detector_object()
                logger.info('已訓練的人臉照片資料 刪除成功')
                return 'success'
            except Exception as e:
                logger.error(f'已訓練的人臉照片資料 刪除失敗, {e}')
                return '刪除失敗' 


        #更新進出名單
        @app_face.route("/upd_enter_list", methods=['POST'])
        def upd_enter_list():
            try:
                data = request.get_json()
                data = data.replace(',', '\n')
                fbackend.save_enter_list(data)
                logger.info('進出權限人員名單 更新成功')
                return '更新名單成功'
            except Exception as e:
                logger.error(f'進出權限人員名單 更新失敗, {e}')
                return '更新名單失敗' 

        # ==================== 註冊人臉頁面  ======================
        @app_face.route("/savePic", methods=['POST'])
        def savePic():
            try:
                data = request.get_json()
                user_id = data['user']
                fence_enable = data['fence_enable']
                register_user_img = globalvar.screen_shot_picture

                # # 檢測有無人臉
                # faceExistence = detect_face2yolotxt(register_user_img) 
                # if not faceExistence:
                #     return 'Fail'

                register_user_img = fbackend.get_roi_image(register_user_img, fence_enable, facevar.fence_setting[1]) #前端有無開啟功能,座標資訊                
                return fbackend.save_register_image(register_user_img, user_id)
            except Exception as e:
                logger.error(f'註冊人臉資料 建檔失敗, {e}')
                return "建檔失敗"

        #==================== 強制解鎖 隱藏功能 ====================================#
        @app_face.route('/impose_unlock', methods=['POST'])  
        def impose_unlock():
            try:
                # q.c_queue.put(FaceVar.SIGNAL.UNLOCK_DOOR)
                self.faceTool.unlock_door()
                logger.info('門禁解鎖成功')
                return 'success'
            except Exception as e:
                logger.error(f'門禁解鎖失敗, {e}')
                return 'error'

        # #======================= 控制 辨識的 Process ============================#
        # @app_face.route("/control_detect_process/<action>", methods=['GET'])
        # def control_detect_process(action):
        #     # 人臉管制 頁面的「Login」按鈕
        #     if action == 'click_login':
        #         if not globalvar.click_start:
        #             q.c_queue.put(FaceVar.SIGNAL.CLICK_LOGIN)
        #             q.c_queue.join()
        #             globalvar.click_start = True
        #             logger.info('人臉:開始辨識')

        #     # 人臉管制 頁面的「Reload」按鈕
        #     elif action == 'click_reload':
        #         globalvar.click_start = False
        #         q.c_queue.put(FaceVar.SIGNAL.CLICK_RELOAD)
        #         logger.info('人臉:停止辨識')
        #         return '已停止辨識...'

        #     return '控制 辨識process 成功!'
            

        return app_face


if __name__ == '__main__':
    pass

