import argparse
import subprocess
import sys
import os

parser=argparse.ArgumentParser()

parser.add_argument('--data_dir', type=str,required=True,
                    help='Directory of scripts and output file')

args=parser.parse_args()
path=os.path.abspath(args.data_dir)

def execute_shell(shell_cmd):

    try:
        subprocess.check_call( shell_cmd, shell=True )

    except subprocess.CalledProcessError as error_msg:

        print(error_msg)
        sys.exit(1)

def shell_no_exit(shell_cmd):

    try:
        subprocess.check_call( shell_cmd, shell=True )

    except subprocess.CalledProcessError as error_msg:

        print(error_msg)



cmd="kubectl delete ds gpu-test"

shell_no_exit(cmd)

cmd="kubectl create -f {0}/gpu-test.yaml".format(path)

execute_shell(cmd)
