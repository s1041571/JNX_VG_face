from datetime import datetime
import re

from vgpy.utils.DataBaseUtils import DataBaseUtils
from vgpy.face.config.ObjectManager import DataBaseManger

from vgpy.utils.logger import create_logger
logger = create_logger()

class FaceDataBase(DataBaseUtils):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.lastWritingTime = datetime.now() # record last time for writing into db
        statement = 'select EMP_NAME, org_id from Person_card_data WHERE EMP_NO=%s'
        result = self.update(statement, ("123456"))

    @staticmethod
    def __get_date():
        return datetime.now().strftime('%Y/%m/%d %H:%M:%S')

    @staticmethod
    def __get_table(tableNum):
        return DataBaseManger.get_attribute()[tableNum]

    @staticmethod
    def __get_gowning():
        return DataBaseManger.get_attribute()["gowning"]

    @staticmethod
    def __get_inOut():
        return DataBaseManger.get_attribute()["inout"] 
    

    # detection result is Fail (face is not detected)
    def write_fail_result(self, detectionResult):
        # three seconds update once 
        if((datetime.now()-self.lastWritingTime).seconds >= 3):
            
            self.lastWritingTime = datetime.now() # update last time for writing into db

            statement = f"INSERT INTO {FaceDataBase.__get_table('table2')} (UserId, UserName, DeptId, ScanTime, FaceDect, Gowning, InOut) \
                                                VALUES (%s, %s, %s, %s, %s, %s, %s)"
            updatedContent = ("NG", "NG", "NG", FaceDataBase.__get_date(), 
                                "NG", FaceDataBase.__get_gowning(), FaceDataBase.__get_inOut())
            self.update(statement, *updatedContent)


    # detection result is person name (face is detected)
    def write_success_result(self, detectionResult):
        print("write_success_result", type(detectionResult))
        # three seconds update once 
        if((datetime.now()-self.lastWritingTime).seconds >= 3):

            self.lastWritingTime = datetime.now()

            # checking detectionResult is card id (ex. card id = 2109049)
            if re.fullmatch('[0-9]+', detectionResult):
                # get persion name and organization id
                statement = f"SELECT EMP_NAME, org_id FROM {FaceDataBase.__get_table('table1')} WHERE EMP_NO={detectionResult}"
                result = self.update(statement, detectionResult)
                if result:
                    UserName, DeptId = result
                else:
                    UserName, DeptId = ("","")

                # write info into db
                statement = f"INSERT INTO {FaceDataBase.__get_table('table2')} (UserId, UserName, DeptId, ScanTime, FaceDect, Gowning, InOut) \
                                                    VALUES (%s, %s, %s, %s, %s, %s, %s)"
                updatedContent = (detectionResult, UserName, DeptId, FaceDataBase.__get_date(), 
                                    "OK", FaceDataBase.__get_gowning(), FaceDataBase.__get_inOut())
                self.update(statement, *updatedContent)
            else:
                logger.info("detection is not card id of auo")
