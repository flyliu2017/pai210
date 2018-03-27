须先获取token，写入token文件

获取token方法：
```sh
curl -X POST http://192.168.2.210:9186/api/v1/token -d "username=xx" -d "password=123456"
```

运行
```sh
python gen_test_scripts.py
```
在generated目录下生产一些列json文件和启动脚本：start.sh

执行start.sh文件，批量发布任务