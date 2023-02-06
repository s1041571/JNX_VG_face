import os
import math
import json
#from ..utils.json_utils import save_json, load_json
from vgpy.utils.json_utils import save_json, load_json

# object 版本
from typing import  Dict, List

current_dir = os.path.dirname(os.path.abspath(__file__))
CONFIG_DIR =  os.path.join(current_dir, 'config')
MASK_COORD_TXT = os.path.join(CONFIG_DIR,'fence_mask_coord.txt')


def get_fence_enable():
    f_path = os.path.join(CONFIG_DIR,'fence_area_coord.json')
    if os.path.exists(f_path):
        with open(f_path, 'r', encoding='utf-8') as a:
            fence_setting = json.load(a)
        return fence_setting['fence_enable']
    else:
        return False

def get_cam_areas():
    # 取得 攝影機 的解析度之下的圍籬的座標
    maskArr = []
    if os.path.exists(MASK_COORD_TXT):
        with open(MASK_COORD_TXT, 'r') as f:
            a = f.read()
            linesArr = a.split('/')
            for lines in linesArr:
                line = lines.split('\n')
                maskCoordArr=[]
                for l in line:
                    if l !='':
                        l=l.replace(' ', '')
                        maskCoordArr.append(tuple(map(int, l.split(','))))
                if maskCoordArr:
                    maskArr.append(maskCoordArr)
        return maskArr
    else:
        return None

def from_canvas_to_camera(canvas_areas_coords, canvas_wh, cam_wh):
    # 把網頁中 canvas設置的點座標，轉換成相機解析度的座標
    canvas_w, canvas_h = canvas_wh
    cam_w, cam_h = cam_wh
    cam_areas = []
    for points in canvas_areas_coords:
        tmp_area_points = []
        for point in points:
            x,y = point          
            x = math.floor(int(x)/(canvas_w/cam_w))
            y = math.floor(int(y)/(canvas_h/cam_h))
            tmp_area_points.append((x, y))
        cam_areas.append(tmp_area_points)

    return cam_areas

def get_canvas_fence_area_str():
    # 取得 網頁canvas 的解析度之下的圍籬的座標  (為字串，格式如下)
    # "{202,62 153,330 147,379 452,474 595,78 },{...},..."
    f_path = os.path.join(CONFIG_DIR,'fence_area_coord.json')
    with open(f_path, 'r', encoding='utf-8') as a:
        a_coord = json.load(a)
    areas_str = ''
    for points in a_coord['coord']:
        points_str = ''
        for point in points:
            points_str += ','.join(point) + ' '
        areas_str += '{%s},' % points_str    
    a_coord['coord'] = areas_str
    return a_coord


def save_fence_areas_ponits(fence_enable, canvas_data, cam_areas):
    # 儲存 canvas 解析度的圍籬座標
    data = {
        "fence_enable":fence_enable,
        "coord": canvas_data[0],
        "img_width": int(canvas_data[1]),
        "img_height": int(canvas_data[2])
    }
    save_json(data, CONFIG_DIR, 'fence_area_coord.json')
    
    # 儲存 攝影機 解析度的圍籬座標
    a = ''
    for points in cam_areas:
        tmp_area_points = []
        for point in points:
            x,y = point
            a += f"{x},{y}\n"
            tmp_area_points.append((x, y))
        a += "/"

    with open(MASK_COORD_TXT, 'w') as f:
        f.write(a)