import numpy as np
import shutil
from pathlib import Path
import face_recognition
import os
import pickle
import time
from ..yolov5.detect_face_to_yolotxt import detect_face2yolotxt
import cv2
from vgpy.utils.logger import create_logger
logger = create_logger()

tolerancenumber = 0.45
# face_path = os.path.join(os.getcwd(), 'config', 'face')
# face_train_img_dir = os.path.join(face_path, 'face_train') #訓練照片新增放置的資料夾
# face_train_yolotxt_dir = os.path.join(os.getcwd(), 'vgpy', 'yolov5', 'runs', 'detect', 'face')

def yolo2face(xyxy, w_ratio=1.0, h_ratio=1.0):
    # 把 yolo的 左上右下， 變成 上右下左
    wr = (1 - w_ratio)/2
    hr = (1 - h_ratio)/2
    w = abs(xyxy[0]-xyxy[2])
    h = abs(xyxy[1]-xyxy[3])
    wv = w*wr
    hv = h*hr
    return int(xyxy[1]+hv), int(xyxy[2]-wv), int(xyxy[3]-hv), int(xyxy[0]+wv)

def save_pickle_object(obj, filename):
    with open(filename, 'ab') as output:
        pickle.dump(obj, output, pickle.HIGHEST_PROTOCOL)
        
def unpickle_database(filename):
    with open(filename, 'rb') as f:
        while True:
            try:
                yield pickle.load(f)
            except EOFError:
                break

def train_sequence(face_train_img_dir, face_train_yolotxt_dir, face_base_dir, face_feature_pkl_path, time_start, result_queue=None):

    faceExistence = detect_face2yolotxt(face_train_img_dir) # 產生的yolo txt 檔，只會留下其中一個人的 bounding box，因此要確保照片只有一個人，才不會不知道是誰

    n=0 # 用來計算 有成功編碼的照片數
    img_files = list(Path(face_train_img_dir).glob('*.jpg'))
    
    has_person_img_files = []
    yolo_xyxy_list = []
    for img_path in img_files:
        txtfile = os.path.join(face_train_yolotxt_dir, str(img_path).split('/')[-1].replace('.jpg', '.txt')) # 存的是該張圖片的人臉位置，yolo的格式
        try:
            with open(txtfile, 'r') as f:
                xyxy = f.readlines()[0].replace('\n', '').split()[1:] # 取yolo預測的照片中的人臉的 xyxy (照片只能有一個人)
                xyxy = list(map(float, xyxy))
                has_person_img_files.append(img_path)
                yolo_xyxy_list.append(xyxy)
        except FileNotFoundError as e: # 沒有檔案，代表該張照片沒偵測到人
            logger.error(f'人臉:用來訓練人臉模型的照片沒偵測到人, {e}')

    known_face_encodings, known_face_names = [], []
                        
    yolo_xyxy_list = np.array(yolo_xyxy_list)

    for img_path, yolo_xyxy in zip(has_person_img_files, yolo_xyxy_list):
        img = face_recognition.load_image_file(img_path)
        # h,w,_ = img.shape
        yolo_xyxy = (yolo_xyxy[0], yolo_xyxy[1], yolo_xyxy[2], yolo_xyxy[3],) # 要按照圖片高 跟 寬 復原回去真實值
        yolo_xyxy = list(map(int, yolo_xyxy))
        
        # 顯示當前用來擷取人臉 Encoding 的照片，及人連框在哪
        # cv2.rectangle(img, (yolo_xyxy[0], yolo_xyxy[1]), (yolo_xyxy[2], yolo_xyxy[3]), color=(0,255,0), thickness=2, lineType=cv2.LINE_AA)
        # cv2.imshow('test', img[:,:,::-1])
        # cv2.waitKey(2000)

        face_location = yolo2face(yolo_xyxy, w_ratio=1, h_ratio=1) # 把 yolo的xyxy(左上右下) 轉成 face 要的 xyxy(上右下左)
        encoding = face_recognition.face_encodings(img, known_face_locations=[face_location], model = "large")

        if not encoding:
            continue

        encoding = encoding[0]
        known_face_encodings.append(encoding)
        # known_face_names.append(os.path.splitext(img_path)[0].split('\\')[-1]) 
        known_face_names.append(os.path.splitext(img_path)[0].split('/')[-1])         
        n+=1

        try:
            shutil.move(str(img_path), face_base_dir) #將照片移置最終資料夾
        except Exception as e:
            logger.error(f'人臉:移動訓練好的照片到face_base_dir失敗, {e}')
            

    # In[將特徵&姓名寫入Pickle] 原 wb 改 ab(寫入方式)    
    if (os.path.isfile(face_feature_pkl_path)):
        pickleList = list(unpickle_database(face_feature_pkl_path))
        try:
            for index, name in enumerate(pickleList[0][1]):
                known_face_encodings.append(pickleList[0][0][index])
                known_face_names.append(pickleList[0][1][index])
        except:
            logger.error(f'FacesFeature.pkl file is empty')

        os.remove(face_feature_pkl_path)

    face_data = [known_face_encodings, known_face_names]
    save_pickle_object(face_data, face_feature_pkl_path)
    a =  list(unpickle_database(face_feature_pkl_path))
    print(a[0][1])

    time_end=time.time()
    time_span = round(time_end-time_start, 1)
    print("人物數：" + str(n)+ " 人, 訓練時間："+str(time_span)+ " 秒。")

    return_value = f"{n},{time_span}"
    if result_queue is None:
        return return_value
    else:
        result_queue.put(return_value) # for multi processing


def train_sequence_old(face_train_img_dir, face_base_dir, face_feature_pkl_path, result_queue=None):
    time_start=time.time()
    known_face_encodings, known_face_names = [], []
    
    n=0 # 用來計算 有成功編碼的照片數
    img_files = list(Path(face_train_img_dir).glob('*.jpg'))
    

    for img_path in img_files:
        img = face_recognition.load_image_file(img_path)                
        encoding = face_recognition.face_encodings(img, model = "large")
        
        if not encoding:
            continue

        encoding = encoding[0]
        known_face_encodings.append(encoding)
        known_face_names.append(os.path.splitext(img_path)[0].split('\\')[-1])        
        n+=1

        try:
            shutil.move(str(img_path), face_base_dir) #將照片移置最終資料夾
        except Exception as e:
            print(e)

    # In[將特徵&姓名寫入Pickle] 原 wb 改 ab(寫入方式)    
    if (os.path.isfile(face_feature_pkl_path)):
        pickleList = list(unpickle_database(face_feature_pkl_path))
        for index, name in enumerate(pickleList[0][1]):
            known_face_encodings.append(pickleList[0][0][index])
            known_face_names.append(pickleList[0][1][index])
        os.remove(face_feature_pkl_path)

    face_data = [known_face_encodings, known_face_names]
    save_pickle_object(face_data, face_feature_pkl_path)
    a =  list(unpickle_database(face_feature_pkl_path))
    print(a[0][1])

    time_end=time.time()
    time_span = round(time_end-time_start, 1)
    print("人物數：" + str(n)+ " 人, 訓練時間："+str(time_span)+ " 秒。")

    return_value = f"{n},{time_span}"
    if result_queue is None:
        return return_value
    else:
        result_queue.put(return_value) # for multi processing
        


