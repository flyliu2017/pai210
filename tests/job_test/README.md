有两种方式可以运行job_test的批量任务提交测试  
第一种，在docker中运行：  
1、将tests文件夹压缩成tar.gz的文件  
2、在tests目录下运行  
docker build -t test  /home/yuanxin/CF/pai-new/pai/tests/  
生成docker镜像  
3、启动容器  
docker run -dit test /bin/bash  
4、进入容器  
docker exec -it docker-container-id bash  
5、进入容器后是在/app目录下的，进入job_test的目录  
cd tests/job_test/  
6、按照需求修改setup.ini  
7、执行python3.6 test_user.py即可  
  
备注：后续也可以将其他的性能测试工具在docker中运行， 提前修改dockerfile即可  
  
第二种，直接在本地机器运行：  
1、检查本地机器和PAI平台的web端网络是否通，本地ping PAI-WEB-IP 即可  
2、本地安装python3.6版本，及对应的pip  
3、从终端进入job_test目录下，安装依赖库  
pip install -r requirement.txt  
4、执行脚本  
python test_user.py  
