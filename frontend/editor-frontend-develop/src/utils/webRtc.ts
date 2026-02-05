import mqtt from 'mqtt'

/**
 *
 * 订单过程：
 *  1、App端发起视频通话请求，会调用发起订单接口，服务端此时订单数据存入redis并会向坐席topic发一条通知。
 *  2、触发Pc端坐席topic，Pc端会刷新接单的消息列表。
 *  3、App端定时器判断是否超时，如果超时，则提示超时并调用取消订单接口，服务端会向坐席topic发送一条取消订单的通知，Pc端收到通知之后，重新调用接口，更新消息列表
 *  4、如果Pc端调用接单接口成功，服务端会向坐席topic发送一条接单成功的通知。
 *  5.1、双端开始进行通话建立的过程。
 *    1、Pc端进入监控页面，向当前需要通话的用户Topic发起建立通话连接。
 *  5.2、如果是通话过程中异常中断，坐席人员会通过手机联系施工人员让App重新建立连接。
 *    1、App通过重新进页面来获取详情，详情中有Pc端的用户id，App端向Pc端的用户Topic发起一条视频通话请求的通知。
 *    2、Pc端收到视频通话请求，点击接通进入监控页面，向当前需要通话的用户Topic发起建立通话连接。
 *
 * Topic值：
 *  - 坐席Topic：supervise/省份编码
 *  - 用户Topic：user/用户账号
 *  -
 * Topic格式
 *
 * 通用格式(JSON字符串)：
 *  - from: 发送方用户名
 *  - to: 接收方用户名(如果是广播形式，则为空)
 *  - clientType: 发送端类型：server(服务端)，pc(Pc端)，app(App端)
 *  - type: 当前通知的类型(100以内为通用，1000以内为业务，1000以上为特殊)：
 *    100(更新订单列表)，101(视频通话请求)，1001(offer交换),1002(answer交换)，1003(ice交换)
 *  - data: 消息携带的数据
 *
 * 通话建立过程：
 * 1、通过RTCPeerConnection创建创建PeerConnect实例，获取本地视频流(Pc端只需推送音频即可)。
 * 2、通过ontrack监听视频流的推送，通过onicecandidate进行ice交换，onicecandidate是通过setLocalDescription方法触发。
 *  2.1、当onicecandidate触发后，会发送自己的ice。
 * 3、通过createOffer创建offer并向接收方的用户Topic发送offer。
 * 4、接收方收到offer，先执行1步骤，然后消费掉offer，然后创建answer并发送给发送方。
 * 5、发送方姐收到answer后，消费掉answer。
 * 6、当ice和sdp都交换成功后，则turn服务会自动建立起视频流，此时会触发ontrack，在ontrack中设置视频。
 *
 */

export const useMqtt = () => {
  const client = mqtt.connect('mqtt://10.10.85.6:1883', {
    username: 'citc',
    password: 'z_vvf6FWvjJ)Mwsedc7A8',
  })
}
