from vgpy.utils.config_utils import get_config

from vgpy.utils.logger import create_logger
logger = create_logger()

class DataBaseManger:

    __fabName = None

    @classmethod
    def choose_fab(cls, fabName):
        cls.__fabName = fabName

    @classmethod
    def get_attribute(cls):
        return get_config("./vgpy/face/config/DBAttributeSetting.ini")[cls.__fabName]

    @classmethod
    def build_face_database_object(cls):

        from vgpy.face.utils.FaceDataBase import FaceDataBase

        cfg = get_config("./vgpy/face/config/DBServerSetting.ini")[cls.__fabName]
        dbInfo = {"host": cfg["host"], "port":cfg["port"], "user": cfg["user"], "password": cfg["password"], "database": cfg["database"]}
        print(dbInfo)
        return FaceDataBase(**dbInfo)


class DetectionManger:

    from vgpy.global_object import DetectionVar
    __object = DetectionVar()

    @classmethod
    def get_detectionVar_object(cls):
        return cls.__object
