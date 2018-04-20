# 性能测试-算力和带宽

## 文件与镜像准备

测试中使用了cuda8.0中自带的sample：`batchCUBLAS`和`bandwidthTest`，分别对应算力和带宽的测试。

为了能够方便快捷地对集群中所有gpu进行测试，可以通过yaml文件[gpu-test.yaml](http://192.168.16.70/liuchang/pai210/blob/master/tests/PerformanceTest/gpu-test.yaml)在集群上创建DaemonSet完成测试任务。

DaemonSet使用了新镜像`192.168.2.212:5000/leinao/gpu-test`，该镜像编译使用了[dockerfile](http://192.168.16.70/liuchang/pai210/blob/master/tests/PerformanceTest/dockerfile)和[start.sh](http://192.168.16.70/liuchang/pai210/blob/master/tests/PerformanceTest/start.sh).

编写了脚本[performance-test.sh](http://192.168.16.70/liuchang/pai210/blob/master/tests/PerformanceTest/performance-test.sh)和[gpu-test.py](http://192.168.16.70/liuchang/pai210/blob/master/tests/PerformanceTest/gpu-test.sh)用于启动测试。


**`batchCUBLAS`、`bandwidthTest`和`performance-test.sh`需要放在nfs目录中（假设该目录路径为`SCRIPTS_PATH`），**  
**该目录会以volumn形式挂载到容器中，如果要使用其他目录，在`gpu-test.yaml`最后一行进行相应修改**


## 启动测试

在集群master上运行`gpu-test.py`即可完成整个测试工作，需要指定`gpu-test.yaml`所在路径。

```bash
python gpu-test.py --data_dir=/path/to/yaml
```

**注意：如果gpu上有其他任务运行会严重影响测试结果**

测试工作大概需要几分钟，完成后，会在`SCRIPTS_PATH`目录下生成`$HOSTNAME-test-result.txt`文件，   
里面保存了`$HOSTNAME`主机上所有gpu卡的测试结果。

## 结果示例

该结果是在`192.168.2.216`集群上测试得到的，也就是`gpu105`上4块卡8个gpu的测试结果，  
以下是gpu0的结果展示，完整文件可以查看`gpu105-test-result.txt`。

**TODO：cuda的程序输出比较冗杂，编写脚本提取其中有效信息，形成简单格式**

算力测试，其中sgemm和dgemm分别对应单精度和双精度,测试了四种模式，一般而言，  
`Running N=100 with streams`的结果是最快的：


```
 ==== Running single kernels ==== 

Testing sgemm
#### args: ta=0 tb=0 m=1536 n=1536 k=1536  alpha = (0xbf800000, -1) beta= (0x40000000, 2)
#### args: lda=1536 ldb=1536 ldc=1536
^^^^ elapsed = 0.00249505 sec  GFLOPS=2904.85
@@@@ sgemm test OK
Testing dgemm
#### args: ta=0 tb=0 m=1536 n=1536 k=1536  alpha = (0x0000000000000000, 0) beta= (0x0000000000000000, 0)
#### args: lda=1536 ldb=1536 ldc=1536
^^^^ elapsed = 0.00613093 sec  GFLOPS=1182.16
@@@@ dgemm test OK
```

带宽测试，分别是主机到gpu、gpu到主机和gpu之间的通信：


```
[CUDA Bandwidth Test] - Starting...
Running on...

 Device 0: Tesla K80
 Quick Mode

 Host to Device Bandwidth, 1 Device(s)
 PINNED Memory Transfers
   Transfer Size (Bytes)	Bandwidth(MB/s)
   33554432			11324.0

 Device to Host Bandwidth, 1 Device(s)
 PINNED Memory Transfers
   Transfer Size (Bytes)	Bandwidth(MB/s)
   33554432			11301.4

 Device to Device Bandwidth, 1 Device(s)
 PINNED Memory Transfers
   Transfer Size (Bytes)	Bandwidth(MB/s)
   33554432			170210.1

Result = PASS

NOTE: The CUDA Samples are not meant for performance measurements. Results may vary when GPU Boost is enabled.
batchCUBLAS Starting...

```