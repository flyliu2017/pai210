import threading
from time import sleep, ctime
import configparser
from jinja2 import Template
# import collections
import requests
import logging
import os
import ftplib
import socket


cf = configparser.ConfigParser()

cf.read("setup.ini")

SERVER_URL = cf.get("parameter", "SERVER_URL")
USER = cf.get("parameter", "USER")
PASSWORD = cf.get("parameter", "PASSWORD")
JOB_NAME_PREFIX = cf.get("parameter", "JOB_NAME_PREFIX")
TMPL_NUM = int(cf.get("parameter", "TMPL_NUM")) + 1
JSON_TMP_PATH = cf.get("parameter", "JSON_TMP_PATH")
JSON_PATH = cf.get("parameter", "JSON_PATH")

FTP_ADDRESS = cf.get("parameter", "FTP_ADDRESS")
UPLOAD_FILE = list(cf.get("parameter", "UPLOAD_FILE")).remove('[')



def gen_job():
    # jobs = collections.OrderedDict()
    jobs = []
    for i in range(1, int(TMPL_NUM)):
        jobName_pre = JOB_NAME_PREFIX + '_{0}'
        jobName = jobName_pre.format(i)
        content = ''
        with open(JSON_TMP_PATH) as f:
            content = f.read()
        tmpl = Template(content)
        if os.path.exists(JSON_PATH) == False:
            os.makedirs(JSON_PATH)
        json_path = os.path.join(JSON_PATH, '{0}.json'.format(jobName))
        with open(json_path, 'w') as f:
            f.write(tmpl.render({"jobName": jobName}))
        jobs.append(json_path)
    return jobs

def thread_job(func, job_path, token):
    threads = []
    list = range(1, int(TMPL_NUM))
    for i in list:
        t = threading.Thread(target=func, args=(job_path[i-1], token, i))
        threads.append(t)
    print('---------------------start -------------------------')
    for j in list:
        threads[j - 1].start()
    for k in list:
        threads[k - 1].join()
    print('---------------------over -------------------------')


def get_token(user, password):
    try:
        post_json = {"username": user, "password": password}
        token_rsp = requests.post(SERVER_URL+'/api/v1/token', post_json, timeout=1)
    except ValueError:
        print("User or Password is Error!!")
    except requests.ConnectionError:
        print("Connection Error!!")
    except requests.Timeout:
        print("TimeOut!!")
    return token_rsp.json()["token"]


def submit_job(job_path, token, num):
    job_name = job_path.split("/")[-1].split('.')[0]
    # job_name = "jobName_110"
    server_url = SERVER_URL + '/api/v1/jobs/' + job_name
    header = {"Content-type": "application/json", "Authorization": 'Bearer '+token}
    # data = "-d @" + job_path
    try:
        print('start request:   %s,%s' % (num, ctime()))
        with open(job_path) as data:
            submit_rsp = requests.put(server_url, data=data, headers=header)
        print(submit_rsp.content)
    except requests.ConnectionError:
        print("Connection Error!!")
    except requests.Timeout:
        print("TimeOut!!")
    return submit_rsp

def ftp_upload(filename, host, user, password):
    try:
        ftp = ftplib.FTP()
        ftp.connect(host=host, port=21)
    except socket.error or socket.gaierror as err:
        print('----ERROR:cannot reach ' + host)
        print(err)
        return False
    try:
        ftp.login(user, password)
    except ftplib.error_perm as err:
        print('----ERROR:cannot login to server ' + host)
        print(err)
        ftp.quit()
        return False

    try:
        if filename == None:
            return False
        for file in filename:
            file_handler = open(file, 'rb')
            ftp.storbinary("STOR %S" % os.path.basename(file), file_handler)
    except ftplib.error_perm as err:
        print('----ERROR:cannot write %s on %s' % (file, host))
        print(err)
        return False
    else:
        print('****Uploaded ' + filename + ' to ' + host + ' successed!!')
        ftp.set_debuglevel(0)
        file_handler.close()
        ftp.quit()
        return True




if __name__ == '__main__':
    ftp_upload(UPLOAD_FILE, FTP_ADDRESS, USER, PASSWORD)
    jobs = gen_job()
    token = get_token(USER, PASSWORD)
    thread_job(submit_job, jobs, token)
    print("ttt")