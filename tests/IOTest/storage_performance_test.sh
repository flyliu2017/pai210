#!/bin/bash
script_ext='.fio'
#set -x
arg=$(getopt -o d:o:h -l dir,output:,help -- $@)
#echo "${arg}"
eval set -- "${arg}"

function runecho()
{
    echo ""
    echo $@
}

while true
do
    case ${1} in 
        -d|--dir)
            ScriptDir=$2
            runecho ScriptDir:$ScriptDir
            shift 2
            ;;
        -o|--output)
            output=$2
            runecho output:$output
            shift 2
            ;;
        -h|--help)
            cat <<EOF
            storage_performane_test.sh options
            -d,--dir       director containing .fio config files 
            -o,--output    files produced by fio command will 
                           be written into this director
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

#${1} name of parameter 
#${2} value of parameter
function checkpara()
{
    if [ -z ${2} ]
    then
        runecho ${1} not exist, please check
        exit 1
    fi
}

# remove last / of path
# example: /home/test/ ===> /home/test
function filePathTrim()
{
    if [ -z ${1} ]
    then
        runecho please input file path
        exit 1
    fi

    lastChar=${1:(-1)}

    if [ "${lastChar}" == '/' ]
    then
        output=${1%/}
    else
        output=${1}
    fi
}

checkpara "ScriptDir" ${ScriptDir}
checkpara "output"    ${output}

:<<zhushi
if [ "$ScriptDir"_ == "_" ]
then
    runecho please input script dir
    exit 1
fi

if [ -z $output ]
then
    runecho please input output director
    exit 1
fi
zhushi

# step 1: detect the tool: fio

fio -h >/dev/null
if [ $? -eq 0 ]
then
   runecho fio installed already
else
   echo ubuntu | sudo -S apt-get -y install fio

   if [ $? -ne 0 ]
   then
      echo !!!!!!!!!!!something wrong with installing fio, please check.!!!!!!!!!!!!
      exit 1
   fi
fi 

# step 2: make output director
mkdir -p ${output}

# step 3: fio test
filePathTrim ${output}
echo output:${output}

ScriptDir=${ScriptDir%/}
echo "ScriptDir:${ScriptDir}"

for file in $(ls ${ScriptDir} | grep ${script_ext})
do
    filebase=$(basename ${file})
    runecho "execute command : fio $ScriptDir/${file} output:${output}/""${filebase%.*}_result.txt"
    fio "$ScriptDir/${file}" | tee ${output}/"${filebase%.*}_result.txt"
done

# get path of temp file
function getFilePathInScipt()
{
    scriptPath=${1}
    if [ "${scriptPath}_" == "_" ]
    then
        runecho usage: getFilePathInScipt scriptPath
        runecho please check the code
        exit 1
    fi

    if [ ! -f ${scriptPath} ]
    then
        runecho file ${scriptPath} does not exist
        return 0
    fi

    filePath=$(cat ${scriptPath} | grep filename)
    #echo $filePath
    filePath=${filePath#*=}
    #echo $filePath
    runecho filepath in function :$filePath
    
    if [ ! -z ${2} ]
    then
        eval ${2}=${filePath}
    fi
}

# remove temp file
for file in $(ls ${ScriptDir} | grep ${script_ext})
do
    filebase=$(basename ${file})
    runecho "execute command : getFilePathInScipt  $ScriptDir/${file} "
    getFilePathInScipt "$ScriptDir/${file}" filePathOut
    #echo filepath in loop :$filePath
    runecho filePathOut : $filePathOut
    if [ -f $filePathOut ]
    then
        runecho rmoving the file: $filePathOut
        rm -f $filePathOut
    fi
done

runecho all fio task finished
echo -e --------please check the files about fio result in: "\033[34m ${output} \033[0m"--------

