# 利用Fio工具进行IO测试
[fio 工具](https://media.readthedocs.org/pdf/fio/latest/fio.pdf)可以测试文件系统读写的 bw, iops, latency
本脚本利用Fio命令进行文件系统IO的自动化测试
## 测试步骤
- 执行脚本  storage_performance_test.sh
```
storage_performance_test.sh -d configdir -o outputdir
```
执行 `storage_performance_test.sh -h` 可以查看脚本执行帮助

```
storage_performane_test.sh options
-d,--dir       director containing .fio script
-o,--output    files produced by fio command will
               be written into this director
```
其中 `-d` 表示fio配置脚本所在的目录, `-o`表示将fio命令生成的结果写入的目录
脚本会依次执行`configdir`目录中的所有配置脚本
- fio配置脚本介绍
在script_sample目录中有示例,详细介绍请参见[fio pdf文档](https://media.readthedocs.org/pdf/fio/latest/fio.pdf)

```
[global]
#ioengine 表示执行时所采用的IO机制
ioengine=libaio
#direct=1表示不采用linux系统的缓冲机制
direct=1
#块大小为4k
bs=4k
#文件大小为512M
size=512m
#directory=/home/ustc/test
#任务数为10个
numjobs=10
#将多个任务的输出报告合并为一个
group_reporting=1
#指定任务的运行时间
runtime=120
#指定IO队列深度
iodepth=32
#任务名称
[job_sequential_randread]
#测试时生成的文件路径和名称
filename=/home/ustc/test/test_rw_randread
#测试的读写模式:read,write, randread, randwrite, randrw
rw=randread
```
`filename=/home/ustc/test/test_rw_randread`filename中指定的目录所在文件系统即为要测试的文件系统    
**如若要测试某个NFS系统,需要先将NFS挂载到本地目录如/home/ustc/test/,然后针对/home/ustc/test/进行fio测试**

- 输出结果含义
可以参考 [Fio Output Explained](http://tobert.github.io/post/2014-04-17-fio-output-explained.html)