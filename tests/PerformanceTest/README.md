# 性能测试-算力和带宽

## 文件与镜像准备

测试中使用了cuda8.0中自带的sample：`batchCUBLAS`和`bandwidthTest`分别对应算力和带宽的测试,  
`p2pBandwidthLatencyTest`可测试单机不同gpu之间的通信带宽。

为了能够方便快捷地对集群中所有gpu进行测试，可以通过yaml文件[gpu-test.yaml](http://192.168.16.70/liuchang/pai210/blob/master/tests/PerformanceTest/gpu-test.yaml)在集群上创建DaemonSet完成测试任务。

DaemonSet使用了新镜像`192.168.2.212:5000/leinao/gpu-test`，该镜像编译使用了[dockerfile](http://192.168.16.70/liuchang/pai210/blob/master/tests/PerformanceTest/dockerfile)和[start.sh](http://192.168.16.70/liuchang/pai210/blob/master/tests/PerformanceTest/start.sh).

编写了脚本[performance-test.sh](http://192.168.16.70/liuchang/pai210/blob/master/tests/PerformanceTest/performance-test.sh)和[gpu-test.py](http://192.168.16.70/liuchang/pai210/blob/master/tests/PerformanceTest/gpu-test.sh)用于启动测试。


**`batchCUBLAS`、`bandwidthTest`、`p2pBandwidthLatencyTest`和`performance-test.sh`需要放在nfs目录中（假设该目录路径为`SCRIPTS_PATH`），**  
**该目录会以volumn形式挂载到容器中，如果要使用其他目录，在`gpu-test.yaml`最后一行进行相应修改**


## 启动测试

在集群master上运行`gpu-test.py`即可完成整个测试工作，需要指定`gpu-test.yaml`所在路径。

```bash
python gpu-test.py --data_dir=/path/to/yaml
```

**注意：如果gpu上有其他任务运行会严重影响测试结果**

测试工作大概需要几分钟，完成后，会在`SCRIPTS_PATH`目录下生成`$HOSTNAME-test-result.txt`和      
`$HOSTNAME-p2bbandwidth.txt`文件,里面保存了`$HOSTNAME`主机上所有gpu卡的测试结果，  
针对`$HOSTNAME-test-result.txt`比较繁杂的情况，还生成了一个简化的结果`$HOSTNAME-simplified-result.txt`。

## 结果示例

该结果是在`192.168.2.216`集群上测试得到的，也就是`gpu105`上4块卡8个gpu的测试结果，  
以下是gpu0的结果展示，完整文件可以查看`gpu105-test-result.txt`和`gpu105-p2bbandwidth.txt`。

gpu105上8个gpu的拓扑结构矩阵，通过`nvidia-smi topo -m`命令得到：

```
	    GPU0	GPU1	GPU2	GPU3	GPU4	GPU5	GPU6	GPU7	CPU Affinity
GPU0	 X 	    PIX	    SYS	    SYS	    SYS	     SYS	 SYS	 SYS	0-7,16-23
GPU1	PIX	     X 	    SYS	    SYS	    SYS	     SYS	 SYS	 SYS	0-7,16-23
GPU2	SYS	    SYS	     X 	    PIX	    PHB	     PHB	 PHB	 PHB	8-15,24-31
GPU3	SYS	    SYS	    PIX	     X 	    PHB	     PHB	 PHB	 PHB	8-15,24-31
GPU4	SYS	    SYS	    PHB	    PHB	     X 	     PIX	 PXB	 PXB	8-15,24-31
GPU5	SYS	    SYS	    PHB	    PHB	    PIX	      X 	 PXB	 PXB	8-15,24-31
GPU6	SYS	    SYS	    PHB	    PHB	    PXB	     PXB	  X 	 PIX	8-15,24-31
GPU7	SYS	    SYS	    PHB	    PHB	    PXB	     PXB	 PIX	  X 	8-15,24-31

Legend:

  X    = Self
  SYS  = Connection traversing PCIe as well as the SMP interconnect between NUMA nodes (e.g., QPI/UPI)
  NODE = Connection traversing PCIe as well as the interconnect between PCIe Host Bridges within a NUMA node
  PHB  = Connection traversing PCIe as well as a PCIe Host Bridge (typically the CPU)
  PXB  = Connection traversing multiple PCIe switches (without traversing the PCIe Host Bridge)
  PIX  = Connection traversing a single PCIe switch
  NV#  = Connection traversing a bonded set of # NVLinks
```

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

带宽测试，分别是主机到gpu、gpu到主机和gpu与自身显存的通信：

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

单机不同gpu之间的通信带宽：

```
Bidirectional P2P=Enabled Bandwidth Matrix (GB/s)
   D\D     0      1      2      3      4      5      6      7 
     0 173.93  22.20  18.08  18.10  17.85  17.98  18.71  17.93 
     1  22.27 172.87  17.72  18.01  17.37  17.94  18.69  17.95 
     2  18.16  17.73 172.52  21.41  19.59  19.60  19.60  19.61 
     3  18.07  17.98  21.49 172.70  19.59  19.58  19.60  19.59 
     4  17.88  18.02  19.64  19.62 172.79  21.41  21.53  21.44 
     5  18.01  17.83  19.61  19.65  21.54 172.09  21.19  21.43 
     6  18.64  18.73  19.66  19.65  22.91  23.69 173.33  21.44 
     7  17.63  18.02  19.62  19.63  21.51  22.44  23.76 173.63 
```