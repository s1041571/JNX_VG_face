from ..yolov5.yolo_face import FaceYoloDetector
from ..utils.img_utils import put_zh_text_opencv, plot_yolo_box_to_yolo_rectangle
from ..config import color
import numpy as np
import pandas as pd
import cv2

import face_recognition
import os
import pickle
import time
from heapq import nlargest
from ..yolov5.utils.calculate import init_fence_point_to_int
from PIL import Image
from vgpy.utils.logger import create_logger
logger = create_logger()

current_dir = os.path.dirname(os.path.abspath(__file__))
face_feature_pkl_path = os.path.join(current_dir, 'model', 'FacesFeature.pkl')

tolerancenumber = 0.45

class Plotter:
    def __init__(self, name, fontsize, known_color, unknown_color):
        """            
            fontsize    字大小
            known_color     辨識出來的人的顏色
            unknown_color   unknown 的顏色
        """
        self.name = name
        self.fontsize = fontsize
        self.known_color = known_color
        self.unknown_color = unknown_color
        

    def put_names_to_rect(self, rect, img, name):
        xyxy = rect.xyxy
        fontsize = self.fontsize
        text_y = (xyxy[1] - 50) # 用來決定字 的 y 的位置

        if name == 'Unknown':
            img = put_zh_text_opencv(img, name, (xyxy[0], text_y), self.unknown_color, fsize=fontsize)
        else:
            img = put_zh_text_opencv(img, name, (xyxy[0], text_y), self.known_color, fsize=fontsize)
     
        return img


    def plot_result(self, rects, img, names):
        for rect, name in zip(rects, names):
            img = self.put_names_to_rect(rect, img, name)
        return img

    def plot_all_fence(self, fences, img, color, line_thickness):
        for fence in fences:
            self.plot_fence_dot_line(fence, img, color, line_thickness)
    
    def plot_fence_dot_line(self, pts, img, color, line_thickness):
        for j in range(len(pts) - 1):
            cv2.circle(img , pts[j], 5, color=color)
            cv2.line(img , pt1=pts[j], pt2=pts[j + 1], color=color, thickness=line_thickness)

        cv2.circle(img , pts[-1], 5, color=color)
        cv2.line(img , pt1=pts[0], pt2=pts[-1], color=color, thickness=line_thickness)

    def img_make_square(self, img, min_size=None, fill_color=(127, 140, 141, 0)): #color預設灰色
        y,x = img.shape[:2]
        size = max(min_size, x, y)  if min_size else max(x, y)
        new_img = np.zeros((size,size,3),np.uint8)
        ax,ay = (size - x)//2,(size - y)//2 #取中心點
        new_img[ay:y+ay, ax:ax+x] = img
        return new_img



def predict_face_names(frame, face_locations, known_face_encodings, known_face_names):
    face_encodings = face_recognition.face_encodings(frame, face_locations)
    known_face_encodings = np.array(known_face_encodings).reshape(-1,128)

    face_names = []
    for face_encoding in face_encodings:
        # 查看臉孔是否與已知的臉孔相符        
        matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance = tolerancenumber)
        name = "Unknown"
        
        # 若找到相符的臉孔，則取用第一個相符的
        face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
        best_match_index = np.argmin(face_distances)
        if matches[best_match_index]:
            name = known_face_names[best_match_index]

        face_names.append(name)
    return face_names

def predict_face_names_landmark(frame, face_locations, known_face_encodings, known_face_names):
    face_encodings = face_recognition.face_encodings(frame, face_locations, model= "large")
    face_landmark = face_recognition.face_landmarks(frame, face_locations, model= "large")
    known_face_encodings = np.array(known_face_encodings).reshape(-1,128)

    face_names = []
    for face_encoding in face_encodings:
        # 查看臉孔是否與已知的臉孔相符        
        matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance = tolerancenumber)
        name = "Unknown"
        
        # 若找到相符的臉孔，則取用第一個相符的
        face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
        best_match_index = np.argmin(face_distances)
        if matches[best_match_index]:
            name = known_face_names[best_match_index]

        face_names.append(name)
    return face_names, face_landmark

PLOT_YOLO_RECTANGLE = True
yolo_classes = ['face']
face_plotter = Plotter('fece', 50, color.深綠, color.淺綠)

def yolo2face(xyxy, w_ratio=1.0, h_ratio=1.0):
    # 把 yolo的 左上右下， 變成 上右下左
    wr = (1 - w_ratio)/2
    hr = (1 - h_ratio)/2
    w = abs(xyxy[0]-xyxy[2])
    h = abs(xyxy[1]-xyxy[3])
    wv = w*wr
    hv = h*hr
    return int(xyxy[1]+hv), int(xyxy[2]-wv), int(xyxy[3]-hv), int(xyxy[0]+wv)


def face2yolo(xyxy):
    # 把  上右下左 ， 變成 yolo的 左上右下
    return int(xyxy[3]), int(xyxy[0]), int(xyxy[1]), int(xyxy[2])


# from .face_api import FaceVar
class FaceDetector():
    def __init__(self, facevar, globalvar:None):
        self.face_yolo_detector = FaceYoloDetector()
        self.known_face_encodings, self.known_face_names = self.get_face_feature()
        self.face_count_dict = dict()
        self.total_face_num = 0
        self.frame_count = 0
        self.facevar = facevar
        self.globalvar = globalvar

    def get_face_feature(self):
        known_face_encodings, known_face_names = [], []
        # In[將特徵&姓名從Pickle讀取出來]
        try:   
            with open(face_feature_pkl_path, "rb") as Feature_path:
                known_face_encodings, known_face_names = pickle.load(Feature_path)
                print("Known faces loaded from disk.")

        except Exception as e:
            with open('vgpy/face/model/FacesFeature.pkl', 'w+') as file:
                logger.error(f'FacesFeature.pkl file is empty or not exist')
                logger.info(f'人臉:沒找到已訓練過的人臉，創建空白的list')
           
        return known_face_encodings, known_face_names
    
    def detect_face_init(self):
        # 初始化參數，每次辨識開始前都要初始化一次
        self.total_face_num = 0
        self.frame_count = 0
        self.face_count_dict = dict()
        self.known_face_encodings, self.known_face_names = self.get_face_feature()

    def __yolo_detect_face(self, img):
        # In[臉部辨識參數初始化]
        face_names = None
        result_img = img.copy()
        result_landmark_img = img.copy()
        img_copy = img.copy()
        if self.facevar.fence_setting:
            fence_enable, fence_roi = self.facevar.fence_setting 
            if fence_enable:
                fences_int = init_fence_point_to_int(fence_roi)
                points = np.array(fences_int[0], np.int32)
                points = points.reshape((-1, 1, 2))
                # ROI 圖像分割
                mask = np.zeros(img_copy.shape, np.uint8)
                # 畫多边形
                mask2 = cv2.fillPoly(mask.copy(), [points], (255, 255, 255))  # 用于求 ROI
                img = cv2.bitwise_and(mask2, img_copy)
                # 畫虛擬圍籬
                fences_int = init_fence_point_to_int(fence_roi)
                face_plotter.plot_all_fence(fences_int, img=result_img, color=(0,0,255), line_thickness=2)

        rectangles, im0 = self.face_yolo_detector.detect_frame(img)
        face_rectangles = [rect for rect in rectangles if rect.name=='face']

        rgb_img = im0.copy()[:, :, ::-1] # 將影像色彩編碼由BGR(OpenCV)轉換為RGB(face_recognition)
       
        # show only one face which has maximum yolo rectangle
        maxYoloRectArea = 0
        maxYoloRectObject = [face_rectangles[0]] if len(face_rectangles)>0 else []
        for rect in face_rectangles:
            rect.xyxy = yolo2face(rect.xyxy, w_ratio=1, h_ratio=1)
            area = abs(rect.xyxy[2] - rect.xyxy[0])*abs(rect.xyxy[1] - rect.xyxy[3])
            if(area > maxYoloRectArea): # find maximum rectangle area
                maxYoloRectArea = area
                maxYoloRectObject = [rect] # find maximum rectangle area
        
        face_rectangles = maxYoloRectObject
        face_locations = [rect.xyxy for rect in face_rectangles]
        
        #取涵蓋特徵部分的座標範圍
        min_x, min_y, max_x, max_y = None, None, 0, 0
        for xyxy in face_locations:
            new_xyxy = face2yolo(xyxy)
            if min_x is None or min_x > min(new_xyxy[0],new_xyxy[2]):
                 min_x = min(new_xyxy[0],new_xyxy[2]) 
            if max_x < max(new_xyxy[0],new_xyxy[2]):
                max_x = max(new_xyxy[0],new_xyxy[2])
            if min_y is None or min_y > min(new_xyxy[1],new_xyxy[3]):
                min_y = min(new_xyxy[1],new_xyxy[3])
            if max_y < max(new_xyxy[1],new_xyxy[3]):
                max_y = max(new_xyxy[1],new_xyxy[3])

        face_names = []
        if len(face_locations): # 有偵測到人頭
            # face_names = predict_face_names(rgb_img, face_locations, self.known_face_encodings, self.known_face_names)
            face_names, face_landmark = predict_face_names_landmark(rgb_img, face_locations, self.known_face_encodings, self.known_face_names)
            # face_names = [name.split('_')[0] for name in face_names] 
            # 是否框出 yolo 預測的框
            if PLOT_YOLO_RECTANGLE:
                for rect, person_name in zip(face_rectangles, face_names):
                    rect.xyxy = face2yolo(rect.xyxy)
                    result_img = plot_yolo_box_to_yolo_rectangle(
                        rect, result_img, color=(77, 77, 255),
                        line_thickness=5, label=person_name.split('_')[0], zh=True)

            # 畫上臉部特徵點位
            if face_landmark:
                for shape in face_landmark:
                    for part in shape:
                        for location in shape.get(part):
                            cv2.circle(result_landmark_img, location, 5, (0,255,0), -1, 8)
                            cv2.putText(result_landmark_img, str(location[0]), location, cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,2555,255))
            result_landmark_img =face_plotter.img_make_square(result_landmark_img[min_y:max_y, min_x:max_x]) 
   
            # # 畫上臉部特徵點位
            # if face_landmark:
            #     for shape in face_landmark:
            #         for i in range(shape.num_parts):
            #             cv2.circle(result_landmark_img, (shape.part(i).x, shape.part(i).y),5,(0,255,0), -1, 8)
            #             cv2.putText(result_landmark_img,str(i),(shape.part(i).x,shape.part(i).y),cv2.FONT_HERSHEY_SIMPLEX,0.5,(255,2555,255))
            # #裁切特徵影像範圍 & 填充成方形
            # result_landmark_img =face_plotter.img_make_square(result_landmark_img[min_y:max_y, min_x:max_x]) 
            
        return result_img, im0, face_names, result_landmark_img


    def detect_face(self, img):
        self.frame_count += 1

        result_img, im0, face_names, result_landmark_img = self.__yolo_detect_face(img)
        for name in face_names:
            name = name.split('_')[0]
            self.total_face_num += 1
            # 計算人臉出現的次數
            if name in self.face_count_dict:
                self.face_count_dict[name] += 1
            else:
                self.face_count_dict[name] = 1
        
        
        font = cv2.FONT_HERSHEY_DUPLEX 
        font_size = int(self.globalvar.cam_wh[0]/1920*100)       
        result_img = cv2.putText(result_img, str(self.frame_count), (0, 25), font, 1, (255, 255, 255), 1)
        face_dict = self.face_count_dict
        if face_dict is not None:
            max_dict = nlargest(3, face_dict, key=lambda k: face_dict[k]) #dict排序 取前三大值
            r = 1 
            yAxis = 125
            for p in max_dict:
                # rankStr = str(r)+"."+p +" : {:.0%}".format( face_dict[p]/self.total_face_num )
                rankStr = str(r)+"." + p
                result_img = put_zh_text_opencv(result_img, rankStr, (0, yAxis), (255, 0, 255), font_size)  #戴入上面的文字顯示方法，畫出中文
                r+=1
                yAxis +=80

        return result_img, im0, result_landmark_img


    def detect_face_old_no_yolo(self, img):
        scalenumber = 0.5
        self.frame_count += 1

        im0 = img.copy()
        img = cv2.resize(img, (0, 0), fx = scalenumber, fy = scalenumber)
        img = img[:, :, ::-1] # 將影像色彩編碼由BGR(OpenCV)轉換為RGB(face_recognition)
        img = np.array(img) # 不加這行不知道為什麼會錯誤

        face_locations = face_recognition.face_locations(img)
        face_encodings = face_recognition.face_encodings(img, face_locations)
        face_names = []

        for face_encoding in face_encodings:
            self.total_face_num += 1
            # 查看臉孔是否與已知的臉孔相符
            matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding, tolerance = tolerancenumber)
            name = "Unknown"
            
            # 若找到相符的臉孔，則取用第一個相符的
            face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
            best_match_index = np.argmin(face_distances)
            if matches[best_match_index]:
                name = self.known_face_names[best_match_index]
            face_names.append(name)

            # 計算人臉出現的次數
            if name in self.face_count_dict:
                self.face_count_dict[name] += 1
            else:
                self.face_count_dict[name] = 1
            
        # 顯示結果
        for (top, right, bottom, left), name in zip(face_locations, face_names):
            # 在臉上畫出方框(new_frame)
            # cv2.rectangle(new_frame, (left, top), (right, bottom), (0, 0, 255), 2)

            # # 在臉上標記辨識出的名字(new_frame)
            # cv2.rectangle(new_frame, (left, bottom - 9), (right, bottom), (0, 0, 255), cv2.cv2.FILLED)
            # font = cv2.FONT_HERSHEY_DUPLEX
            # cv2.putText(new_frame, name, (left + 1, bottom - 1), font, 0.4, (255, 255, 255), 1)

            scaleup = 1/scalenumber
            top *= int(scaleup)
            right *= int(scaleup)
            bottom *= int(scaleup)
            left *= int(scaleup)
            
            # 在臉上畫出方框(frame)
            cv2.rectangle(img, (left, top), (right, bottom), (0, 0, 255), 2)
                        
            # 在臉上標記辨識出的名字(frame)
            cv2.rectangle(img, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.cv2.FILLED)
            # font = cv2.FONT_HERSHEY_DUPLEX   #無法顯示中文
            # cv2.putText(frame, name, (left + 6, bottom - 6), font, 1.0, (255, 255, 255), 1)   #無法顯示中文
            img = put_zh_text_opencv(img, name, (left+1, bottom-35), (255, 255, 255), 35) # 顯示中文字

        
        font = cv2.FONT_HERSHEY_DUPLEX        
        img = cv2.putText(img, str(self.frame_count), (0, 25), font, 1, (255, 255, 255), 1)
        face_dict = self.face_count_dict
        if face_dict is not None:
            max_dict = nlargest(3, face_dict, key=lambda k: face_dict[k]) #dict排序 取前三大值
            r = 1 
            yAxis = 125
            for p in max_dict:
                rankStr = str(r)+"."+p +" : {:.0%}".format( face_dict[p]/self.total_face_num )
                img = put_zh_text_opencv(img, rankStr, (5, yAxis), (255, 0, 255), 80)  #戴入上面的文字顯示方法，畫出中文
                r+=1
                yAxis +=80

        img = img[:, :, ::-1] # 從 RGB轉回 BGR
        return img, im0

