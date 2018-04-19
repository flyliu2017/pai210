#!/bin/bash

cd /root/gpu-test
chmod 777 performance-test.sh bandwidthTest  batchCUBLAS
./performance-test.sh
