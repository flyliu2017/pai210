#  How to maintain pai cluster
 - [Build the maintain-box image and start up](#maintain_box)
 - [Initialize your cluster](#initialize_cluster)
 - [Add new worker nodes to your cluster](#add_worker_new_node)
 - [Remove worker nodes from your cluster](#remove_worker_node)
 - [Repair worker nodes in your cluster](#repair_worker_node)
 - [Destroy whole pai cluster](#destroy_cluster)
 - [Fix crashed etcd instance](#etcd_fix) 

## Prepare the maintain-box of pai <a name="maintain_box"></a>

Do everything in a docker container is recommended. So your should [install docker](https://www.docker.com/community-edition) on your host first.  

### Note:
- The host should have full network access to the pai cluster. 
- Ubuntu 16.04 LTS is recommended. Though, theoretically, other distribution should be work well too. 
- Prepare your [cluster-configuration](http://192.168.16.70/LeiNao/pai/blob/pai_210/kubernetes-deployment/cluster-config.yaml) first.
- Suggest to build the latest maintain-box every time you need to maintain your cluster. 

### Steps:
```bash
# clone our repo first.
git clone https://github.com/Microsoft/pai.git

# Go into the workdir.
cd pai/kubernetes-deployment/

# Build your maintain-box.
sudo docker build -t kubernetes-deployment .

# Running your maintain-box as a docker container.
sudo docker run -itd \
        -e COLUMNS=$COLUMNS -e LINES=$LINES -e TERM=$TERM \
        -v /path/to/your/cluster-configuration:/cluster-configuration  \
        -v /var/lib/docker:/var/lib/docker \
        -v /var/run/docker.sock:/var/run/docker.sock \
        --pid=host \
        --privileged=true \
        --net=host \
        --name=deployment \
        kubernetes-deployment

# Working in your maintain-box
sudo docker exec -it deployment /bin/bash
cd /pai/kubernetes-deployment

```


## Initialize pai cluster <a name="initialize_cluster"></a>
Assume that you have in your maintain-box following the steps in this [chapter](#maintain_box).

### Note:
- To setup pai in your cluster, you should guarantee that all your machine's os should be ubuntu 16.04 LTS. 
- In the process of initialize the pai cluster, an tool named kubectl will be installed into your maintain-box, through which you could control your cluster. For more infomation about this tool, your could refer to [kubernetes official site](https://kubernetes.io/).
- If failed to initialize pai cluster, you should do [cleaning](#destroy_cluster) steps before re-initializing pai cluster.

### Steps:
```bash
./bootstrap.py -p /path/to/your/clusterconfig.yaml -a deploy
```

## Add new worker nodes to pai cluster <a name="add_worker_new_node"></a>
Assume that you have in your maintain-box following the steps in this [chapter](#maintain_box).

### Note:
- You should guarantee that all the new node's os should be ubuntu 16.04 LTS.
- You should prepare a configuration yaml file to describe the node you want to add. More information about the configuration file, please refer to this [link](https://github.com/Microsoft/pai/blob/master/kubernetes-deployment/node-list-example.yaml).  

### Steps:
```bash

# If the maintain-box is new, you should install kubectl first. Or you can skip the first step.
./bootstrap.py -p /path/to/your/clusterconfig.yaml -a install_kubectl

# Add new node from nodelist.yaml
./bootstrap.py -p /path/to/your/clusterconfig.yaml -f /path/to/your/newnodelist.yaml -a add
```



## Remove worker nodes from pai cluster <a name="remove_worker_node"></a>
Assume that you have in your maintain-box following the steps in this [chapter](#maintain_box)

### Note:
- You should prepare a configuration yaml file to describe the node you want to remove. More information about the configuration file, please refer to this [link](https://github.com/Microsoft/pai/blob/master/kubernetes-deployment/node-list-example.yaml).  

### Steps:
```bash

# If the maintain-box is new, you should install kubectl first. Or you can skip the first step.
./bootstrap.py -p /path/to/your/clusterconfig.yaml -a install_kubectl

# Remove node from nodelist.yaml
./bootstrap.py -p /path/to/your/clusterconfig.yaml -f /path/to/your/newnodelist.yaml -a remove
```


## Repair worker nodes in your cluster <a name="repair_worker_node"></a>
Assume that you have in your maintain-box following the steps in this [chapter](#maintain_box)

If some nodes in your cluster is unhealthy, you should repair them. The node status could be found by kubectl, kubernetes dashboard or other service.

### Note:
- You should prepare a configuration yaml file to describe the node you want to repair. More information about the configuration file, please refer to this [link](https://github.com/Microsoft/pai/blob/master/kubernetes-deployment/node-list-example.yaml).  

### Steps:
```bash

# If the maintain-box is new, you should install kubectl first. Or you can skip the first step.
./bootstrap.py -p /path/to/your/clusterconfig.yaml -a install_kubectl

# Repair node from nodelist.yaml
./bootstrap.py -p /path/to/your/clusterconfig.yaml -f /path/to/your/newnodelist.yaml -a repair
```

## Destroy whole cluster <a name="destroy_cluster"></a> 
Assume that you have in your maintain-box following the steps in this [chapter](#maintain_box)

### Note:
- This method will delete all kuberentes related data of pai in your cluster.

### Steps:

```
# If the maintain-box is new, you should install kubectl first. Or you can skip the first step.
./bootstrap.py -p /path/to/your/clusterconfig.yaml -a install_kubectl

# Destroy whole cluster.
./bootstrap.py -p /path/to/your/clusterconfig.yaml -a clean
```

## Fix crashed etcd instance <a name="etcd_fix"></a>
If the etcd node in your cluster crashed and k8s failed to restart it. you could fix the etcd node and restart it by the following command.

Note: please be sure that there is only one node (infra node container etcd) on the nodelist.

```
# If the maintain-box is new, you should install kubectl first. Or you can skip the first step.
./bootstrap.py -p /path/to/your/clusterconfig.yaml -a install_kubectl

# Destroy whole cluster.
./bootstrap.py -p /path/to/your/clusterconfig.yaml -f /path/to/your/newnodelist.yaml -a etcdfix
```
