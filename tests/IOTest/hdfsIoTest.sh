#!/bin/bash
arg=$(getopt -o p:f:o:h -l file,output,pod:,help -- $@)
eval set -- "${arg}"

function runecho()
{
    echo ""
    echo $@
}

while true
do
    case ${1} in 
        -f|--file)
            filePath=$2
            runecho filePath:$filePath
            shift 2
            ;;
        -o|--output)
            output=$2
            runecho output:$output
            shift 2
            ;;
        -p|--pod)
            pod=$2
            runecho pod:$pod
            shift 2
            ;;
        -h|--help)
            cat <<EOF
            hdfsIoTest.sh options
            -f,--file      file containing IO commands 
            -o,--output    files produced by hdfs command will 
                           be written into this director
            -p,--pod       name of pod
EOF
            shift
            exit 0
            ;;
        --)
            shift
            break
            ;;
    esac
done

function checkpara()
{
    if [ -z ${2} ]
    then
        runecho ${1} not exist, please check
        exit 1
    else 
        runecho ${1} is ${2}
    fi
}

checkpara "filePath"  ${filePath}
checkpara "output"    ${output}
checkpara "pod"       ${pod}

output=${output%/}
mkdir -p ${output}

jarPath='/usr/local/hadoop-2.7.2/share/hadoop/mapreduce/hadoop-mapreduce-client-jobclient-2.7.2-tests.jar'
while read -r command
do
    if [ "${command}_" != "_" ]
    then
        runecho ${command}
        kubectl exec ${pod} -- hadoop jar ${jarPath} ${command}
    fi
done<${filePath}

kubectl exec ${pod} -- hadoop jar ${jarPath} TestDFSIO -clean

kubectl cp  ${pod}:TestDFSIO_results.log ${output}/hdfsIoTestResult.txt

kubectl exec ${pod} -- rm -f TestDFSIO_results.log

