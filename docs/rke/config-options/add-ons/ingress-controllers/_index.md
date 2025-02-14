---
title: K8s Ingress Controllers
description: 默认情况下，RKE 会在所有可调度节点上部署 NGINX ingress controller。
keywords:
  - rancher
  - rancher中文
  - rancher中文文档
  - rancher官网
  - rancher文档
  - Rancher
  - rancher 中文
  - rancher 中文文档
  - rancher cn
  - RKE
  - 配置选项
  - 插件
  - RKE 插件
  - Ingress 插件
---

默认情况下，RKE 会在所有可调度节点上部署 NGINX ingress controller。

> **说明：** 从 v0.1.8 开始，只有 worker 节点是可调度节点，但在 v0.1.8 之前， worker 节点和 controlplane 节点都是是可调度节点。

RKE 将以 DaemonSet 的形式部署 Ingress Controller，并使用 `hostnetwork: true`，因此在部署控制器的每个节点上都会打开 `80`和`443`端口。

:::note 注意
从 V1.1.11 开始，入口控制器的网络选项是可配置的。参见[网络配置选项](#网络配置选项)。
:::

Ingress Controller 使用的镜像在[系统镜像](/docs/rke/config-options/system-images/_index)中。对于每个 Kubernetes 版本，都有与 Ingress Controller 相关联的默认镜像，这些镜像可以通过更改`system_images`中的镜像标签来覆盖默认设置。

## 调度 Ingress Controller

如果只想在特定的节点上部署 Ingress Controller ，可以在`dns`部分设置一个`node_selector`。`node_selector`中的标签需要与要部署 Ingress Controller 的节点上的标签相匹配。

```yaml
nodes:
  - address: 1.1.1.1
    role: [controlplane, worker, etcd]
    user: root
    labels:
      app: ingress

ingress:
  provider: nginx
  node_selector:
    app: ingress
```

### 入站优先级类别名称

_从 RKE v1.2.6+开始可用_

[pod priority](https://kubernetes.io/docs/concepts/configuration/pod-priority-preemption/#pod-priority)是通过配置优先级类名称来设置的。

```yaml
ingress:
  provider: nginx
  ingress_priority_class_name: system-cluster-critical
```

### 容忍度

_从 v1.2.4 开始提供_

配置的容忍度适用于`kube-dns`和`kube-dns-autoscaler`部署。

```yaml
dns:
  provider: kube-dns
  tolerations:
    - key: "node.kubernetes.io/unreachable"
      operator: "Exists"
      effect: "NoExecute"
      tolerationseconds: 300
    - key: "node.kubernetes.io/not-ready"
      operator: "Exists"
      effect: "NoExecute"
      tolerationseconds: 300
```

要检查`coredns`和 `coredns-autoscaler`部署的应用容忍度，请使用以下命令：

```
kubectl get deploy kube-dns -n kube-system -o jsonpath='{.spec.template.spec.tolerations}'。
kubectl get deploy kube-dns-autoscaler -n kube-system -o jsonpath='{.spec.template.spec.tolerations}'。
```

## 禁用默认 Ingress Controller

您可以在集群配置中的 Ingress`provider`设置为`none`，禁用默认的 Ingress Controller。

```yaml
ingress:
  provider: none
```

## 配置 NGINX Ingress Controller

Kubernetes 中有 NGINX 选项：[NGINX 配置图的选项列表](https://github.com/kubernetes/ingress-nginx/blob/master/docs/user-guide/nginx-configuration/configmap.md)、[命令行 extra_args](https://github.com/kubernetes/ingress-nginx/blob/master/docs/user-guide/cli-arguments.md)和[注释](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)。

```yaml
ingress:
  provider: nginx
  options:
    map-hash-bucket-size: "128"
    ssl-protocols: SSLv2
  extra_args:
    enable-ssl-passthrough: ""
```

### 禁用 NGINX Ingress 默认后端

从 v0.20.0 开始，你可以禁用入口控制器的[默认后台服务](https://kubernetes.github.io/ingress-nginx/user-guide/default-backend/)，这是因为`ingress-nginx`会回到本地 404 页面，而不需要后台服务。这是可能的，因为`ingress-nginx`将返回到本地 404 页面，并且不需要后端服务。该服务可以通过布尔值来启用和禁用。

```yaml
ingress:
  default_backend: false
```

如果省略该字段会发生什么情况？这保持了旧版本`rke`的行为。然而，未来版本的`rke`将把默认值改为`false`。

### 网络配置选项

_从 v1.1.11 版起可用_

默认情况下，nginx ingress controller 使用 `hostNetwork: true` 配置，默认端口为`80`和`443`。如果你想改变模式或端口，请参阅下面的选项。

使用`hostPort`配置 nginx ingress controller ，并覆盖默认端口:

```yaml
ingress:
  provider: nginx
  network_mode: hostPort
  http_port: 9090
  https_port: 9443
  extra_args:
    http-port: 8080
    https-port: 8443
```

配置 nginx ingress controller，不使用网络模式，这将使它在 overlay 网络上运行（例如，如果你想使用`LoadBalancer`暴露 nginx ingress controller），并覆盖默认端口:

```yaml
ingress:
  provider: nginx
  network_mode: none
  extra_args:
    http-port: 8080
    https-port: 8443
```

## 配置 NGINX 默认证书

在配置具有 TLS 终止功能的 ingress 对象时，必须为其提供用于加密/解密的证书。与其在每次配置 ingress 时明确定义证书，不如设置一个默认使用的自定义证书。

在使用通配符证书的环境中，设置默认证书特别有用，因为该证书可以应用在多个子域中。

> **先决条件**
>
> - 访问用于创建集群的`cluster.yml`。
> - 你将使用的 PEM 编码证书作为默认证书。

1. 获取或生成 PEM 编码形式的证书密钥对。

2. 运行以下命令，从你的 PEM 编码证书中生成一个 Kubernetes 密钥，用`mycert.cert`和`mycert.key`代替你的证书。

   ```
   kubectl -n ingress-nginx create secret tls ingress-default-cert --cert=mycert.cert --key=mycert.key -o yaml --dry-run=true > ingress-default-cert.yaml
   ```

3. 将 `ingress-default-cert.yml`的内容嵌入到 RKE 的`cluster.yml`文件中：

   ```yaml
   addons: |-
     ---
     apiVersion: v1
     data:
       tls.crt: [ENCODED CERT]
       tls.key: [ENCODED KEY]
     kind: Secret
     metadata:
       creationTimestamp: null
       name: ingress-default-cert
       namespace: ingress-nginx
     type: kubernetes.io/tls
   ```

4. 用下面的`default-ssl-certificate`参数定义你的 ingress 资源，它引用了我们之前在`cluster.yml`中`extra_args`下创建的密钥。

   ```yaml
   ingress:
     provider: "nginx"
     extra_args:
       default-ssl-certificate: "ingress-nginx/ingress-default-cert"
   ```

5. **可选：** 如果想将默认证书应用到已经存在的集群中的入口，必须删除 NGINX 入口控制器 pods，让 Kubernetes 使用新配置的`extra_args`调度新的 pods。
   ```
   kubectl delete pod -l app=ingress-nginx -n ingress-nginx
   ```

```

```
