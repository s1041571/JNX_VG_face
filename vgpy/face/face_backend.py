import os
from datetime import datetime
import time
from multiprocessing import JoinableQueue
from multiprocessing import Process
from threading import Thread
# import serial #NX上使用
import cv2
import numpy as np
#from . import config
import imp
config = imp.load_source('', './vgpy/face/config.py')
from ..utils.config_utils import get_config, save_config, remove_config_option, add_config_option
from ..utils.img_utils import cv2_save_zh_img, save_img_in_subprocess
from ..yolov5.utils.calculate import init_fence_point_to_int
from ..global_function import process_response_image, unpickle_database, save_pickle_object, os_makedirs
# import Jetson.GPIO as GPIO

from vgpy.utils.logger import create_logger
logger = create_logger()


current_dir = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(current_dir, 'image')
CONFIG_DIR = os.path.join(current_dir, 'config')
MODEL_DIR = os.path.join(current_dir, 'model')

FACE_PATH = os.path.join(IMG_DIR, 'face')
FACE_BASE = os.path.join(FACE_PATH, 'face_base') # 照片訓練完後放置的資料夾
FACE_TRAIN = os.path.join(FACE_PATH, 'face_train') # 訓練照片新增放置的資料夾

ENTER_LIST_TXT_PATH = os.path.join(CONFIG_DIR, 'Enter_List.txt') # 可進入的人員名單
FACE_FEATURE_PKL_PATH = os.path.join(MODEL_DIR, 'FacesFeature.pkl') # 人臉的特徵

# serialPort = serial.Serial('/dev/relay',9600) #門禁繼電器控制
onMsg  = [ b'\xA0\x01\x01\xA2', b'\xA0\x02\x01\xA3', b'\xA0\x03\x01\xA4', b'\xA0\x04\x01\xA5' ] #訊號-開
offMsg = [ b'\xA0\x01\x00\xA1', b'\xA0\x02\x00\xA2', b'\xA0\x03\x00\xA3', b'\xA0\x04\x00\xA4' ] #訊號-關
statMsg = b'\xFF'
# GPIO控制 (製造展用)
door_pin = 24   # 控制開關門
# GPIO.setmode(GPIO.BOARD)
# GPIO.setup(door_pin, GPIO.OUT)


def init_dirs():
    os_makedirs(IMG_DIR, verbose=False)
    os_makedirs(CONFIG_DIR, verbose=False)
    os_makedirs(MODEL_DIR, verbose=False)
    os_makedirs(FACE_BASE, verbose=False)
    os_makedirs(FACE_TRAIN, verbose=False)
init_dirs()

def get_fence_enable():
    return config.get_fence_enable()

def get_cam_areas(): 
    return config.get_cam_areas()
    
def get_canvas_fence_area_str():
    return config.get_canvas_fence_area_str()

def get_roi_image(img0, fence_enable, fence_coord):
    result_img = img0.copy()
    if fence_enable:
        fences_int = init_fence_point_to_int(fence_coord)
        points = np.array(fences_int[0], np.int32)
        points = points.reshape((-1, 1, 2))
        # ROI 圖像分割
        mask = np.zeros(img0.shape, np.uint8)
        # 畫多边形
        mask2 = cv2.fillPoly(mask.copy(), [points], (255, 255, 255))  # 用于求 ROI
        result_img = cv2.bitwise_and(mask2, img0)
        # 畫虛擬圍籬
    return result_img

def save_fence_coord(area_json, wh):
    fence_enable = area_json['fence_enable']
    canvas_areas = area_json['area_coord'] # 前端的 canvas 上畫的圍籬座標
    canvas_height =int(area_json['img_height'])
    canvas_width = int(area_json['img_width'])

    w, h = wh
    print('寬*高'+ str(w) +','+str(h))
    
    cam_areas = config.from_canvas_to_camera(canvas_areas, canvas_wh=(canvas_width, canvas_height),cam_wh=wh)
                
    config.save_fence_areas_ponits(fence_enable, canvas_data=(canvas_areas,canvas_width,canvas_height), cam_areas=cam_areas)  #add 儲存canvas所有前端資訊    
    logger.info(f'人臉:成功儲存新設定的圍籬區域:\n{cam_areas}') # [[('1781', '41'), ('1670', '127'), ('1858', '129')]]

def get_enter_list():
    with open(ENTER_LIST_TXT_PATH, "r",encoding='utf-8') as f:
        enter_list = f.readlines()
        enter_list = [name.replace('\n', '') for name in enter_list]
    return enter_list

def get_enter_list_string():
    enter_str = get_enter_list()
    enter_str = ','.join(enter_str)
    # TODO 測試完成後可刪除
    # with open(ENTER_LIST_TXT_PATH, 'r', encoding='utf-8') as f:
    #     enter_str = f.read()
    #     enter_str = enter_str.replace('\n', ',')
    return enter_str

def save_enter_list(enter_list_string):
    with open(ENTER_LIST_TXT_PATH, "w", encoding='utf-8') as f:
        f.write(enter_list_string)


def get_train_img_string():
    train_img_string = ''
    for fname in os.listdir(FACE_TRAIN):
        if '.jpg' in fname:            
            train_img_string += "{'id':'%s'}," % fname.replace('.jpg','')

    if not train_img_string:
        return '{}'

    return train_img_string

def get_base_img_string():
    # base_img_string = ''
    name_list = []
    pickleList = list(unpickle_database(FACE_FEATURE_PKL_PATH))
    #TODO: 原是抓face_base內的圖檔資料 改為從 pickle取人員資料
    try:
        for index, name in enumerate(pickleList[0][1]):
            # 可能有多張同名的face_name 只取一次名字 
            name = name.split('_')[0]
            if {'id':f'{name}'} not in name_list:
                name_list.append({'id':f'{name}'})
        if len(name_list) == 0:
            return []
    except:
        pass

    return name_list


def save_login_image(img, person_name):
    log_img_dir = os.path.join(current_dir, 'image', 'login', datetime.today().strftime("%Y%m%d"))    
    if not os.path.exists(log_img_dir):
        os.makedirs(log_img_dir)

    login_img_name = f'{person_name}_{datetime.today().strftime("%H%M")}.jpg'
    log_img_path = os.path.join(log_img_dir, login_img_name)
    # cv2.imwrite(log_img_path, img) # cv2 無法在 subprocess 中 儲存圖片
    save_img_in_subprocess(log_img_path, img, isBGR=True)

def save_register_image(img, person_name):
    if img is not None:
        latest_register_img_dir = os.path.join(current_dir, 'image')

        latest_register_img_path = os.path.join(latest_register_img_dir, f'latest_register.jpg')

        cv2.imwrite(latest_register_img_path, img)

        base_img_path = os.path.join(FACE_BASE, f'{person_name}.jpg')
        if not os.path.isfile(base_img_path): # 該人臉 沒有 註冊過
            train_img_path = os.path.join(FACE_TRAIN, f'{person_name}.jpg')
            cv2_save_zh_img(train_img_path, img, file_extension='.jpg') # 解決中文名存檔問題   
            logger.info('人臉:註冊人臉資料 建檔成功')
            return 'success'
        else:
            logger.warning('人臉:註冊人臉資料 建檔失敗，該人名已經註冊過')
            return '該人名已經註冊過'

    else:
        logger.error('人臉:註冊人臉未收到照片，請聯絡窗口')
        return '請聯絡窗口'


def return_facebase_image_to_web(filename):
    filepath = os.path.join(FACE_BASE, f'{filename}.jpg')
    return process_response_image(filepath)


def return_facetrain_image_to_web(filename):
    filepath = os.path.join(FACE_TRAIN, f'{filename}.jpg')
    return process_response_image(filepath)


# 模型訓練頁面的操作
def delete_train_img(remove_user_list):
    result = ''
    for user in remove_user_list:
        file = os.path.join(FACE_TRAIN, f'{user}.jpg')
        if(os.path.isfile(file)):
            os.remove(file)
            result += user +','
        else:
            continue    

    logger.info('待訓練的人臉照片資料 刪除成功')
    return result[0:-1] # 回傳整個字串 除了最後一個字元(因為尾巴會多一個逗點)

def delete_base_img(remove_user_list):
    # 刪除照片 包含人名_1、人名_2...之照片
    for user in remove_user_list:
        for file in os.listdir(FACE_BASE):
            file = file.replace('.jpg','')
            if user in file:    # 分支檔名是否包括全名
                if file != user:
                    remove_user_list.append(file)   #如果有分支照片新增至移除清單 方便後續pickle移除
                file = os.path.join(FACE_BASE, f'{file}.jpg')
                if(os.path.isfile(file)):
                    os.remove(file)
    
    # 更新pickle
    pickleList = list(unpickle_database(FACE_FEATURE_PKL_PATH))
    known_face_encodings = [] 
    known_face_names = []
    
    for index, name in enumerate(pickleList[0][1]):
        if name in remove_user_list:
            continue
        else:
            # print("Name: {}\nData {}: {}".format(a[0][1][index],index, a[0][0][index]))
            known_face_encodings.append(pickleList[0][0][index])
            known_face_names.append(pickleList[0][1][index])
    
    os.remove(FACE_FEATURE_PKL_PATH)
    face_data = [known_face_encodings, known_face_names]
    save_pickle_object(face_data, FACE_FEATURE_PKL_PATH)

    test_unpickle_new_file =  list(unpickle_database(FACE_FEATURE_PKL_PATH))
    return test_unpickle_new_file


# 人臉模型訓練
def face_model_train():
    from .face_model_train import train_sequence
    face_train_yolotxt_dir = os.path.join(FACE_TRAIN, 'labels')
    train_result_queue = JoinableQueue()
    time_start = time.time()
    train_p = Process(
        target=train_sequence,
        args=(FACE_TRAIN, face_train_yolotxt_dir, FACE_BASE, FACE_FEATURE_PKL_PATH, time_start, train_result_queue),
        daemon=True)
        
    train_p.start()
    logger.info('人臉:人臉模型訓練subprocess啟動')
    logger.info('人臉:訓練中...')
    train_p.join()    
    result = train_result_queue.get()
    logger.info('人臉:訓練完成')
    return result


# 門禁控制
def door_unlock():
    # serialPort.write(onMsg[0])     # Turn OFF     0:Relay-1、1:Relay-2、2:Relay-3、3:Relay-4
    # GPIO.output(door_pin, GPIO.HIGH)
    print('門已解鎖...5秒後將再度上鎖') 
    time.sleep(5)
    # serialPort.write(offMsg[0])    # Turn ON
    # GPIO.output(door_pin, GPIO.LOW) 
    print('門已上鎖!') 


from heapq import nlargest
from ..global_object import StreamingQueues, GlobalVar
from vgpy.face.face_detector import FaceDetector
class FaceDetectorTool:

    def __init__(self, q:StreamingQueues, globalvar: None, facevar):

        from .face_api import identify_default_time, frame_default_number

        self.q = q
        self.globalvar = globalvar
        self.identify_default_time = identify_default_time
        self.frame_default_number = frame_default_number
        self.facevar = facevar
        self.face_detector = FaceDetector(self.facevar, self.globalvar)
        self.face_start_time = datetime.now()
    

    @staticmethod
    def unlock_door():
        door_unlock()


    # 更新辨識設定 (辨識的frame數、時間限制)
    def set_default_time_and_num(self, identify_default_time, frame_default_number):
        self.identify_default_time, self.frame_default_number = identify_default_time, frame_default_number


    def init_detector_object(self):
        self.face_detector.detect_face_init()


    def change_cam_id(self, camId, camWH):
        self.facevar.cam_id = camId
        self.facevar.cam_wh = camWH
    

    def get_detection_result(self, img):
        
        startTime = time.time()

        from .face_api import FaceVar

        result_img, im0, result_landmark_img = self.face_detector.detect_face(img)
        
        face_identify_result = None
      
        now_time = datetime.now()
        if((now_time - self.face_start_time).seconds > self.identify_default_time): #執行時間超過重整
            self.face_start_time = datetime.now()
            face_identify_result = 'Timeout'

        if self.face_detector.frame_count >= self.frame_default_number: #達到辨識張數 回傳結果
            self.face_start_time = datetime.now()
            face_dict = self.face_detector.face_count_dict
            result = nlargest(1, face_dict, key=lambda k: face_dict[k])    #取辨識率最高者 # face_dict[p]/totalFaceNum
            if result:
                best_match_person_name = result[0]
                enter_list = get_enter_list()

                if best_match_person_name not in enter_list: # 辨識率最高的人沒有在 進入名單中
                    face_identify_result = 'Fail'
                else:
                    person_name = result[0]
                    face_identify_result = person_name
                    save_login_image(im0, person_name)                        
                    self.q.c_queue.put(FaceVar.SIGNAL.UNLOCK_DOOR)
            self.face_detector.detect_face_init()

        if face_identify_result is not None:
            self.facevar.face_identify_result = face_identify_result
        else:
            self.facevar.face_landmark_img = result_landmark_img

        print(f"time = {time.time()-startTime}")

        return result_img, self.facevar # 回傳預測照片、預測結果、臉部特徵影像