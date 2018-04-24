#!/usr/bin/env bash

#Test calculation performance and bandwidth of all gpus (one by one) on the machine.

gpunum=$(nvidia-smi -L|wc -l)
hostname=$(hostname)

function del_exited_file ()
{
    if [ -e $1 ]
    then
        rm $1
    fi
}

del_exited_file ${hostname}-test-result.txt
del_exited_file ${hostname}-simplified-result.txt
del_exited_file ${hostname}-p2pbandwidth.txt


nvidia-smi -L | tee ${hostname}-simplified-result.txt

i=0
while [ $i -lt $gpunum ]
do
    ./batchCUBLAS -N100 -m1536 -n1536 -k1536 device=$i
    echo -e "\n"
    ./bandwidthTest --device=$i
    let "i++"
done | tee ${hostname}-test-result.txt

./p2pBandwidthLatencyTest | sed -n '/Connectivity Matrix/,$p' | tee ${hostname}-p2pbandwidth.txt


sed -n -r 's/.*GFLOPS=(.*)$/\1/p' gpu105-test-result.txt  > cal.txt

i=0
n=1

while [ $i -lt $gpunum ]
do
    dpmax=$(sed -n "$n,+7p" cal.txt | awk 'BEGIN{max=0} NR%2==1{if($1>max) max=$1} NR%8==0{print max}')
    spmax=$(sed -n "$n,+7p" cal.txt | awk 'BEGIN{max=0} NR%2==0{if($1>max) max=$1} NR%8==0{print max}')

    echo -e "+++++++++++++++++++++++++++++++++\n"

    echo -e "gpu[$i] calculation performance:\n"
    echo "double precision: "+ $dpmax "GFLOPs"
    echo -e "single precision: "+ $spmax "GFLOPs\n"

    echo "gpu[$i] bandwidth:"
    sed -n "/Device $i/,/Result/p" gpu105-test-result.txt | sed -n '3,+15p'


    let "i++"
    let "n+=8"
done | tee -a ${hostname}-simplified-result.txt


while true;do sleep 1000; done
