#!/usr/bin/env bash

#Test calculation performance and bandwidth of all gpus (one by one) on the machine.
#The result will be saved in test-result.txt

nvidia-smi -L

gpunum=$(nvidia-smi -L|wc -l)
hostname=$(hostname)

i=0
while [ $i -lt $gpunum ]
do
    ./batchCUBLAS -N100 -m1536 -n1536 -k1536 device=$i
    echo -e "\n"
    ./bandwidthTest --device=$i
    let "i++"
done | tee ${hostname}-test-result.txt

while true;do sleep 1000; done
