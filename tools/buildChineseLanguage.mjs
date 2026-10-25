#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const toolDirectory = path.dirname(fileURLToPath(import.meta.url))
const languageDirectory = path.resolve(toolDirectory, '..', 'languages')
const sourcePath = path.join(languageDirectory, 'en_CA.json')
const targetPath = path.join(languageDirectory, 'zh.json')
const pendingPath = path.join(languageDirectory, 'zh.pending.json')

const source = JSON.parse(await fs.readFile(sourcePath, 'utf8'))

const glossary = {
  'Account': '账户',
  'Accounts': '账户',
  'Account Settings': '账户设置',
  'Admin': '管理员',
  'Alarms': '告警',
  'Archive': '归档',
  'Archived': '已归档',
  'Camera is not recording': '摄像机未在录像',
  'Camera is not running': '摄像机未运行',
  'Camera is not streaming': '摄像机未在传输视频流',
  'Dashboard': '控制台',
  'Detector': '检测器',
  'Detection': '检测',
  'Disabled': '已禁用',
  'Event': '事件',
  'Events': '事件',
  'FileBin': '文件箱',
  'Live Grid': '实时画面',
  'Live View': '实时预览',
  'Log': '日志',
  'Logs': '日志',
  'Monitor': '监控',
  'Monitors': '监控',
  'Monitor Settings': '监控设置',
  'Motion': '移动侦测',
  'Motion Detection': '移动侦测',
  'Record': '录像',
  'Recording': '录像',
  'Save': '保存',
  'Settings': '设置',
  'Stream': '视频流',
  'Timelapse': '延时摄影',
  'Video': '录像',
  'Videos': '录像',
  'Watch-Only': '仅观看',
  'Yes': '是',
  'No': '否',
  'On': '开启',
  'Off': '关闭',
  'Enabled': '已启用',
  'Delete': '删除',
  'Edit': '编辑',
  'Add': '添加',
  'Close': '关闭',
  'Open': '打开',
  'Search': '搜索',
  'Download': '下载',
  'Username': '用户名',
  'Password': '密码',
  'Email': '电子邮箱',
  'Home': '首页',
  'System': '系统',
  'Network': '网络',
  'Plugin': '插件',
  'Plugins': '插件',
  'Plugin Manager': '插件管理器',
  'Superuser': '超级管理员',
  'Sub-Accounts': '子账户',
  'Authentication': '身份验证',
  '2-Factor Authentication': '双重身份验证',
  '#mobile-client Chat': '#mobile-client 聊天',
  'Active Monitors': '运行中的监控',
  'Active Tutorial': '当前教程',
  'Currently Active': '当前已启用',
  'Motion GUI': '移动侦测界面',
  'Stream Channels': '视频流频道',
  'Copy Stream Channels': '复制视频流频道',
  'Streamer': '推流器',
  'Email on No Motion': '无移动侦测时发送电子邮件',
  'Discord on No Motion': '无移动侦测时发送 Discord 通知',
  'EventText1': '事件触发于',
  'Down Stop': '向下停止 <small>URL 地址</small>',
  'Up Stop': '向上停止 <small>URL 地址</small>',
  'pluginDownloadText': "请参阅文档了解如何<a href='https://docs.shinobi.video/plugin/install' target='_blank'>安装插件</a>。",
  'fieldTextModeDisabled': '监控处于停用状态，此模式下不会创建任何进程。',
  'fieldTextModeWatchOnly': '监控只提供视频流，不会录像；API 或检测器另行触发时除外。',
  'fieldTextPortForce': '使用默认网络端口时，可自动切换到其他端口以传输 RTSP 等视频流。',
  'fieldTextDetectorSensitivity': '移动侦测置信度必须高于此值才会触发事件。该数值直接对应移动侦测器返回的置信度；此选项旧称“Indifference（灵敏度阈值）”。',
  'Indifference': '灵敏度阈值',
  'Max Indifference': '最大灵敏度阈值',
  'sports ball': '球',
  'Feed-in Image Width': '输入图像宽度',
  'Feed-in Image Height': '输入图像高度',
  'ONVIF Home Control': 'ONVIF 家庭控制',
  'Pop': '弹出',
  'Power Viewer': '高级查看器',
  'Stitch': '拼接',
  'Studio': '工作室',
  'liveJpegApiEnabled': '启用实时 JPEG API',
  'Inserted State Configuration': '已添加状态配置',
  'Recording Watermark': '录像水印',
  'Link Shinobi': '关联 Shinobi',
  'activateShinobi': '激活 Shinobi',
  'howToActivate': '订阅以下任一方案即可支持 Shinobi 的开发并激活软件。订阅后，请在超级管理员面板中填写订阅 ID，然后重启 Shinobi 完成激活。感谢支持！ <i class="fa fa-smile-o"></i>',
  "'Already Installing...'": '已在安装…',
  'accelerationRuntimesHint': '本机可用的硬件加速运行环境。直接安装在本机的插件会使用这些环境；以容器运行的插件自带运行环境。',
  'AddAllRalliedText': '要从指定的 Shinobi 服务器汇聚并添加这些监控吗？',
  'All streams in first feed': '第一个输入源中的所有视频流',
  'allowSpammingViaEmailDes': '取消账户相关邮件（如密码重置邮件）的常规发送间隔限制。不建议启用。',
  'Allowed IPs': '允许的 IP',
  'API Key': 'API 密钥',
  'API Keys': 'API 密钥',
  'Average Confidence': '平均置信度',
  'Avg. Confidence': '平均置信度',
  'autoDropCache': '自动释放操作系统磁盘缓存',
  'autoDropCacheDes': '定期要求操作系统释放磁盘缓存，仅适用于内存受限的系统。',
  'autoResizeGrid': '自动调整网格大小',
  'Call Method': '调用方式',
  "Cannot watch a monitor that isn't running.": '无法观看未运行的监控。',
  'cell phone': '手机',
  'ChangeMonitorConfigurationText': '将使用所选值修改选中的监控。',
  'Click to seek': '点击跳转',
  'cloudUploadersDes': '子账户可选择使用这些共享凭据（Amazon S3、Backblaze B2、Google Drive、Wasabi、WebDAV、挂载磁盘），无需填写自己的凭据。',
  'codecMismatchText1': '摄像机正在提供 H.265（HEVC）视频流，而“视频流”部分的视频编解码器设置为 copy（直通）。不支持此编解码器的设备可能无法显示 Shinobi 输出的视频流；Shinobi Mobile 可以查看此类视频流。',
  'codecMismatchText2': '所选视频编解码器不适用。摄像机正在提供 MJPEG 视频流，而“视频流”部分的视频编解码器设置为 copy（直通）。已将视频流类型更改为 MJPEG。',
  'codecMismatchText3': '所选视频编解码器不适用。摄像机正在提供 MJPEG 视频流，而“录像”部分的视频编解码器设置为 copy（直通）。已将视频编解码器更改为 libx264。',
  'compressCompletedVideosFieldText': '录像完成后自动压缩为 WebM。压缩需要较强的 CPU，或者需要预留足够时间。录像写入数据库的速度不能超过压缩速度。',
  'Confidence': '置信度',
  'Country of Plates': '车牌所属国家/地区',
  'credentialsFileHint': '本机凭据文件的路径。文件应分行保存 username=、password=，以及可选的 domain=。请仅允许 root 读取该文件（chmod 600），避免将密码写入所有本机用户都能读取的 /etc/fstab。',
  'Cycle Monitors': '轮播监控',
  'Cycle Monitors per row': '每行轮播监控数',
  'DatabaseOptionDes': '用于连接保存详细信息的数据库的凭据。',
  'deleteOrphansDes': '删除底层文件已不在磁盘上的录像数据库记录。',
  'deleteOverMaxOffsetDes': '触发清理前，应用于每项存储占比的乘数（0 到 1）。例如，默认值 0.9 会使 90% 的录像占比阈值实际在达到存储上限的 90% × 0.9 = 81% 时触发清理。这是全局安全余量，不会显示在各账户的存储设置中；如果磁盘使用量总是低于设定比例，请先检查此值。',
  'DeleteThisMsg': '要删除此项吗？删除后无法恢复。',
  'deleteTimelpaseFramesDes': '在 CRON 清理期间自动删除旧的延时摄影帧。',
  'Detector Grouping': '检测器分组 <small>请在<b>设置</b>中添加组</small>',
  'Detector Recording Complete': '检测器录像完成',
  'Detector Recording Process Exited Prematurely. Restarting.': '检测器录像进程提前退出，正在重启。',
  'Died': '已终止',
  'disableSSRFSelfTargetFilterDes': '允许监控和探测功能访问本服务器自身的链路本地地址和元数据地址（169.254.0.0/16、0.0.0.0）。默认关闭；仅在了解风险后启用。',
  'Dismissed': '已忽略',
  'Donations, One-Time Boost': '捐赠与一次性支持',
  'Down': '向下 <small>URL 地址</small>',
  'Drop Event': '丢弃事件',
  'dropCompletedVideoFrames': '禁止从已完成的录像中截取帧',
  'Email on Trigger': '触发时发送电子邮件',
  'emailClientSecureText': '否 = STARTTLS（在普通连接上升级，通常使用 587 端口）；是 = 隐式 SSL/TLS（通常使用 465 端口）。请选择邮件服务商要求的方式，设置不匹配会导致“Greeting never received”或“wrong version number”错误。',
  'Emotion': '情绪',
  'eventBasedPtzDescription': '当此监控触发事件时，可让另一台监控自动转到指定的 ONVIF PTZ 预设位。目标监控必须支持 ONVIF，并已在自身设置中配置可用的 PTZ 预设位。',
  'eventFilterActionText': '以下操作会在过滤条件匹配后执行。“原始选择”是指监控设置中原先选择的选项。',
  'eventFilterErrorBrackets': '括号数量不是偶数，相关括号将被忽略。',
  'eventFiltersDescription': '设置事件发生时使用的过滤规则。',
  'eventsTableNoVideoTitle': '没有录像覆盖此事件',
  'eventsTableResultsCount': '共找到 {total} 个事件，当前显示 {count} 个（本页有录像的事件：{withVideo} 个）',
  'failoverServersDescription': '在此连接故障转移服务器。请填写故障转移 Shinobi 服务器的 IP 地址和端口；服务器密钥必须在故障转移服务器上创建。要把一台 Shinobi 服务器设为故障转移服务器，请在其 conf.json 中添加 <code>"isFailover": true,</code>，然后重启服务器。',
  'Fatal Maximum Reached': '已达到致命错误次数上限，正在停止摄像机。',
  'FFmpegCantStartText': '无法启动此摄像机的录像引擎，摄像机配置可能有误。如还有其他日志，请将它们提交到 GitHub 的 <b>Issues</b>。',
  'ffmpegDirDes': 'FFmpeg 可执行文件的完整路径。留空则自动检测。',
  'FFprobe': '探测',
  'fieldTextAccelerator': '用于解码视频流的硬件加速（HWAccel）。',
  'fieldTextActionsCommand': '用于在收到命令时触发脚本。',
  'fieldTextActionsIndifference': '修改触发事件所需的最低灵敏度阈值。',
  'fieldTextActionsRecord': '使用“全局检测设置”中当前配置的基于事件录像、热切换或删除无移动录像功能。',
  'fieldTextAudioDelay': '一次事件触发告警后，到允许下一次告警的等待时间，单位为秒。',
  'fieldTextChannelHlsTime': '每个视频分段的时长，单位为分钟。客户端通过 m3u8 文件加载这些分段；分段越短，占用空间越少。',
  'fieldTextChannelStreamType': '客户端使用此视频流的方式。',
  'fieldTextChannelStreamTypeHLS(includesAudio)': '与 Facebook 直播类似。输入包含音频时，<b>输出也包含音频</b>。由于该方式会先生成分段再推送给客户端，因此约有 4～6 秒延迟。',
  'fieldTextChannelStreamVcodecCopy': '用于 MP4 视频。CPU 占用很低，但不能使用视频滤镜，文件也可能非常大。使用此选项时，最好直接在摄像机端配置 MP4 参数。',
  'fieldTextChannelSvf': '在此填写用于视频流输出的 FFmpeg 视频滤镜参数，不要包含空格。',
  'fieldTextControlInvertY': '摄像机倒置安装或垂直控制方向相反时启用。',
  'fieldTextCustomOutput': '添加自定义输出，例如输出 JPEG 帧，或将数据直接发送到其他服务器。',
  'fieldTextCustSipRecord': '应用于基于事件录像所取用输出的自定义参数。',
  'fieldTextCutoff': '录像分段时长，单位为分钟。达到该时长后会结束当前文件并创建新文件。默认上限为 15 分钟，除非在超级管理员配置中提高 <code>maxRecordingSegmentLength</code>。',
  'fieldTextDetailSubstreamOutputStreamType': '客户端使用此视频流的方式。',
  'fieldTextDetailSubstreamOutputStreamVcodecCopy': '用于 MP4 视频。CPU 占用很低，但不能使用视频滤镜，文件也可能非常大。使用此选项时，最好直接在摄像机端配置 MP4 参数。',
  'fieldTextDetailSubstreamOutputSvf': '在此填写用于视频流输出的 FFmpeg 视频滤镜参数，不要包含空格。',
  'fieldTextDetectorAudio': '检查音量是否达到指定分贝值。分贝读数可能与现实中的仪器测量值存在偏差。',
  'fieldTextDetectorBufferHlsTime': '每个视频分段的时长，单位为秒。客户端通过 m3u8 文件加载这些分段；分段越短，占用空间越少。',
  'fieldTextDetectorColorThreshold': '像素差异达到此值后才视为发生移动。',
  'fieldTextDetectorCommand': '要执行的命令，相当于在终端中运行 shell 命令。安全提示：该命令在 shell 中执行。{{REASON}}、{{REGION_NAME}}、{{TAG}}、{{DETAILS}} 等占位符会由事件数据填充，而任何能触发此监控的人（例如持有 control_monitors API 密钥的人）都可能提供这些数据。执行前会移除这些值中的 shell 元字符，但仍应仅对可信脚本使用此功能。',
  'fieldTextDetectorCommandTimeout': '再次允许运行脚本前的等待时间，单位为分钟。',
  'fieldTextDetectorLineCounter': '添加越线计数器。物体穿过指定线条时计数加一。仅适用于对象检测器或类似插件。',
  'fieldTextDetectorLockTimeout': '允许下一次触发前的锁定时间，用于避免数据库和接收客户端过载，单位为毫秒。',
  'fieldTextDetectorMaxSensitivity': '移动侦测置信度必须低于此值才会触发事件。留空表示不设上限；此选项旧称“Max Indifference（最大灵敏度阈值）”。',
  'fieldTextDetectorNoiseFilter': '尝试按指定灵敏度阈值过滤画面颗粒噪声或重复移动。',
  'fieldTextDetectorNoiseFilterRange': '像素差异达到此值后才视为发生移动。',
  'fieldTextDetectorNotriggerCommand': '要执行的命令，相当于在终端中运行 shell 命令。安全提示：该命令在 shell 中执行。{{REASON}}、{{REGION_NAME}}、{{TAG}}、{{DETAILS}} 等占位符会由事件数据填充，而任何能触发此监控的人（例如持有 control_monitors API 密钥的人）都可能提供这些数据。执行前会移除这些值中的 shell 元字符，但仍应仅对可信脚本使用此功能。',
  'fieldTextDetectorNotriggerCommandTimeout': '再次允许运行脚本前的等待时间，单位为分钟。',
  'fieldTextDetectorPam': '使用 Shinobi 内置的 Kevin Godell 移动侦测器，无需其他配置即可启用。',
  'fieldTextDetectorRecordMethod': '移动侦测等事件发生时有多种开始录像的方式，其中基于事件录像最易使用。',
  'fieldTextDetectorSave': '把事件保存到数据库，以便在录像回放画面上显示事件。',
  'fieldTextDetectorSendVideoLength': '发送到电子邮件或 Discord 等通知服务的视频时长，单位为秒。',
  'fieldTextDetectorThreshold': '触发移动侦测事件所需的最少检测次数。所有检测必须发生在“触发阈值 ÷ 检测器 FPS”秒内。例如，检测器 FPS 为 2、触发阈值为 3 时，必须在 1.5 秒内检测到 3 次才会触发事件。每个检测区域分别计算此阈值。',
  'fieldTextDetectorTimeout': '“触发录像”的持续时间，单位为分钟。',
  'fieldTextFatalMax': '服务器与摄像机的网络连接失败多少次后将监控设为“禁用”。必须填写整数；设为 0 表示无限重试。',
  'fieldTextFps': '写入录像文件的帧率（FPS）。此项没有默认值，设置过高会生成很大的文件；最好在摄像机端设置。',
  'fieldTextHeight': '视频流图像的高度。',
  'fieldTextHlsTime': '每个视频分段的时长，单位为秒。客户端通过 m3u8 文件加载这些分段；分段越短，占用空间越少。',
  'fieldTextInputTimeout': 'FFmpeg 遇到网络读写停滞时，等待多少秒后放弃，以便 Shinobi 重启视频流。可用于处理摄像机重启或 Wi-Fi 断开后卡死的问题（RTMP/RTSP）。留空表示禁用。例如：5 表示 5 秒。',
  'fieldTextIp': '范围或单个地址',
  'fieldTextIrCutFilterAuto': '由设备自动控制红外截止滤光片。',
  'fieldTextIrCutFilterOff': '关闭红外截止滤光片，通常用于夜间模式。',
  'fieldTextIrCutFilterOn': '开启红外截止滤光片，通常用于日间模式。',
  'fieldTextLoglevel': '任务运行时输出的日志详细程度。',
  'fieldTextName': '便于识别此监控的显示名称。',
  'fieldTextOnvifHomeControl': '部分 ONVIF 摄像机使用不同方式让 PTZ 返回原位。如果 PTZ 自动跟踪在闲置 7 秒后没有自动回到原位，请逐一尝试以下选项。',
  'fieldTextPath': '摄像机的路径。',
  'fieldTextProtocol': '用于获取视频流的协议。',
  'fieldTextRecordingOverlap': '允许多个基于事件的录像任务并行运行。仅当每次检测器触发后都必须开始一段新录像时启用。',
  'fieldTextRecordTimelapseWatermark': '叠加到延时摄影录像帧上的图像。',
  'fieldTextRecordTimelapseWatermarkPosition': '叠加到延时摄影录像帧上的图像。',
  'fieldTextRtmpKey': 'RTMP 端口接收推流时使用的推流密钥。',
  'fieldTextStreamTimestamp': '叠加到视频流画面上的时钟。',
  'fieldTextStreamTimestampBoxColor': '时间戳背景颜色。',
  'fieldTextStreamTimestampColor': '时间戳文字颜色。',
  'fieldTextStreamType': '客户端使用此视频流的方式。',
  'fieldTextStreamTypeHLS(includesAudio)': '与 Facebook 直播类似。输入包含音频时，<b>输出也包含音频</b>。由于该方式会先生成分段再推送给客户端，因此约有 4～6 秒延迟。',
  'fieldTextStreamVcodecCopy': '用于 MP4 视频。CPU 占用很低，但不能使用视频滤镜，文件也可能非常大。使用此选项时，最好直接在摄像机端配置 MP4 参数。',
  'fieldTextStreamVf': '在此填写用于视频流输出的 FFmpeg 视频滤镜参数，不要包含空格。',
  'fieldTextStreamWatermarkPosition': '叠加到视频流画面上的图像。',
  'fieldTextTimestamp': '叠加到录像画面上的时钟。',
  'fieldTextTimestampBoxColor': '时间戳背景颜色。',
  'fieldTextTimestampColor': '时间戳文字颜色。',
  'fieldTextType': '用于获取视频流的方式。',
  'fieldTextTypeH.264/H.265/H.265+': '读取有时包含音频的高质量视频流。',
  'fieldTextTypeHLS(.m3u8)': '读取有时包含音频的高质量视频流。',
  'fieldTextWatchdogReset': '录像期间发生新事件时，把当前录像超时计时器重新从头开始计算。',
  'fieldTextWatermark': '叠加到录像画面上的图像。',
  'fieldTextWatermarkPosition': '叠加到录像画面上的图像。',
  'First stream in feed': '输入源中的第一路视频流',
  'for Global Access': '用于全局访问',
  'forceCloudUploaderText': '使用服务器上配置的凭据。管理员无法查看或修改这些凭据，而且该上传器不会显示在其账户设置中。',
  'forumOnReddit': 'Reddit 论坛',
  'Frigate': 'Frigate',
  'Full Stream URL': '完整视频流 URL',
  'getATvChannel': '获取监控的电视频道',
  'globalCloudUploadersText': '供所有将云上传器设为“强制”的管理员账户使用的凭据。凭据保存在服务器的 conf.json 中，绝不会发送到管理员控制台。必须把“自动保存”设为“是”，否则不会上传；因为强制上传器对管理员不可见，管理员无法自行开启。留空表示不配置该上传器。',
  'Google Drive': 'Google Drive',
  'H264Profile': 'H.264 配置文件',
  'Image Location': '图像路径',
  'Imaging': '图像设置',
  'InputText2': '点击<a target="_blank" href="https://shinobi.video/docs/configure">此处</a>了解如何配置和调优摄像机。',
  'InputText3': '如果不确定摄像机的输入类型，请查看 Shinobi 网站上的<a href="http://shinobi.video/docs/cameras" target="_blank">摄像机 URL 列表</a>。',
  'Inserted Schedule Configuration': '已添加计划配置',
  'IP Address': 'IP 地址',
  'JPEG API Flags': 'JPEG API 参数',
  'JPEG Mode': 'JPEG 模式',
  'Left': '向左 <small>URL 地址</small>',
  'Left Stop': '向左停止 <small>URL 地址</small>',
  'Line Counter': '越线计数器',
  'Link LDAP Account': '关联 LDAP 账户',
  'MailError': '邮件错误：无法发送电子邮件，请检查 conf.json。将跳过所有依赖邮件的功能。',
  'matrixBot': '启用 Matrix 机器人',
  'maxRecordingSegmentLength': '最大录像分段时长（分钟）',
  'maxRecordingSegmentLengthDes': '监控录像分段时长的上限，默认为 15 分钟。提高此值可以生成更长的录像文件，但如果录像进程在文件关闭前终止，丢失的画面也会更多。',
  'Monitor Died': '监控进程已终止',
  'Monitor mode is already': '监控模式已经是',
  'monitorEditFailedMaxReachedUnactivated': '系统已达到可创建的摄像机数量上限。必须激活此安装才能创建更多摄像机。',
  'MonitorStatesText': '请在 ShinobiHub <a href="https://hub.shinobi.video/articles/view/6ylYHj9MemlZwrM" target="_blank">查看使用说明</a>。',
  'Montage': '画面拼接',
  'Motion Meter': '移动侦测强度',
  'Moving to Home Preset': '正在移至原位预设位',
  'MP4 (copy, libx264, libx265)': 'MP4（copy 直通、libx264、libx265）',
  'mqttClientDes': '连接到 MQTT Broker，使监控可由 MQTT 主题触发，或向 MQTT 主题发布消息。',
  'New to Shinobi?': '初次使用 Shinobi？',
  'NoMotionEmailText1': '持续无移动侦测：',
  'NoMotionEmailText2': '摄像机持续未检测到移动，时长：',
  'Nothing Selected': '未选择任何内容',
  'notificationBaseUrlDes': '用于生成推送通知和电子邮件中深层链接的基础 URL。未设置时依次回退到“基础 URL”和服务器自动检测到的 IP。',
  'notPermitted1': '账户管理员不允许执行此操作。',
  'NTP Servers': 'NTP 服务器',
  'Number of Monitors': '监控数量',
  'On Release': '释放时',
  'ONVIFEventsNotAvailable': 'ONVIF 事件不可用',
  'opencvCascadesText': '如果此处没有内容，请下载<a href="https://cdn.shinobi.video/weights/cascades.zip">级联分类器包</a>，解压到 <code>plugins/opencv/cascades</code>，然后点击刷新 <i class="fa fa-retweet"></i>。',
  'Over by': '超出',
  'peopleTagsDes': '在标签和图标功能中视为“人物”的对象标签。默认值为 person、Person、Man、Woman、Boy、Girl。',
  'performanceOptimizeText1': '摄像机正在提供 H.264 视频流。可将视频流类型设为 HLS 或 Poseidon，并将视频编解码器设为 copy（直通）。',
  'Ping Failed': 'Ping 失败',
  'Plug': '插头',
  'Popout on Event': '事件发生时弹出',
  'Position X': 'X 位置',
  'Position Y': 'Y 位置',
  'postDataBroken': "请检查 JSON 格式，确保内容已序列化为字符串并放在 'data' 字段下。",
  'Power Video Viewer': '高级视频查看器',
  'Process Unexpected Exit': '进程意外退出',
  'pushover': '启用 Pushover 通知',
  'Rally': '汇聚',
  'rallyChannelDescription': '要从中汇聚的频道，默认值为 0（主频道）。',
  'rallyDescription': '在此连接另一台 Shinobi 服务器，并把其中的摄像机添加到当前服务器。视频连接将来自远端 Shinobi 服务器，而不是直接连接摄像机。',
  'Raw H.264 Stream': '原始 H.264 视频流',
  'Record File Type': '录像文件类型',
  'Record Height': '录像高度',
  'Record Video Filter': '录像视频滤镜',
  'Record Width': '录像宽度',
  'Recorded Buffer': '录像缓冲区',
  'Recording Complete': '录像完成',
  'Recording Flags': '录像参数',
  'Recording FPS': '录像帧率',
  'Recording FPS Change on Start': '录像开始时更改帧率',
  'Recording Overlap': '录像重叠',
  'Recording Timeout': '录像超时 <small>（分钟）</small>',
  'Recording Timestamp': '录像时间戳',
  'recordings shown': '条录像',
  'RecordingText': '建议将<b>录像文件类型</b>设为 <b class="h_t_input h_t_jpeg h_t_socket">WebM</b><b class="h_t_input h_t_mjpeg h_t_h264 h_t_hls h_t_mp4 h_t_local">MP4</b>，并将<b>视频编解码器</b>设为 <b class="h_t_input h_t_jpeg h_t_socket">libvpx</b><b class="h_t_input h_t_h264 h_t_hls h_t_mp4">copy（直通）或 </b><b class="h_t_input h_t_mjpeg h_t_h264 h_t_hls h_t_mp4 h_t_local">libx264</b>，因为当前<b>输入类型</b>为 <b class="h_t_text"></b>。',
  'Reset the points for this region?': '要重置此区域的所有点吗？',
  'Restart': '重启',
  'Restart Monitor': '重启监控',
  'Restarting': '正在重启',
  'restartMonitorMsg': '要重启此监控吗？当前录像将结束，实时视频流会短暂中断。',
  'restartOnVideoNotExist': '录像文件缺失时重启监控',
  'Right': '向右 <small>URL 地址</small>',
  'Right Stop': '向右停止 <small>URL 地址</small>',
  'RTMP Stream': 'RTMP 视频流',
  'RTMP Stream Flags': 'RTMP 视频流参数',
  'rtmpServerDes': '启动 Shinobi 内置的 RTMP 接收和中继服务器；它独立于摄像机端的 RTMP 推流。',
  'Save Log in SQL': '将日志保存到 SQL <small>数据量可能很快增大。</small>',
  'Second stream in feed': '输入源中的第二路视频流',
  'Separate with commas, no spaces': '用逗号分隔，不要包含空格',
  'Set Home': '设置原位',
  'Set Home Position (ONVIF-only)': '设置原位（仅限 ONVIF）',
  'shinobiHubApiKey': 'Shinobi Hub API 密钥',
  'shinobiHubAutoBackup': 'Shinobi Hub 自动备份',
  'shinobiHubEndpoint': 'Shinobi Hub 端点',
  'Simultaneous Monitor Start': '同时启动监控',
  'sizePurgeLockedText': '存储空间清理锁（deleteOverMax）似乎未能解除，正在立即解锁…',
  'smtpServerPort': 'SMTP Drop-In 服务器端口',
  'State Configuration Not Found': '找不到状态配置',
  'Stream Flags': '视频流参数',
  'Stream in Background': '在后台播放视频流',
  'Stream Key': '推流密钥',
  'Stream to YouTube': '推流到 YouTube',
  'Stream to YouTube Flags': 'YouTube 推流参数',
  'subAccountManager': '子账户管理器',
  'Substream': '子码流',
  'Substream Process': '子码流进程',
  'SubstreamNotConfigured': '尚未配置子码流，请打开监控设置完成配置。',
  'substreamOutputText': '在此设置点播子码流。点击<a href="https://hub.shinobi.video/articles/view/Eug1dxIdhwY6zTw" target="_blank">此处了解不同视频流类型的延迟</a>。',
  'substreamText': '这是按需观看实时视频流的方式。可设为仅在有人观看时启动，也可用于在低分辨率与高分辨率之间切换。',
  'tagsTriggerCannotAddText': '触发标签必须匹配已添加到其他监控的标签，或匹配准备添加到当前监控的标签。',
  'Tested on': '测试环境',
  'Time Occurred': '发生时间',
  'Timeout Reset on Next Motion': '下次检测到移动时重置超时计时器',
  'Toggle Substream': '切换子码流',
  'Under by': '低于',
  'Uniform': '均匀',
  'URL Stop Timeout': '停止 URL 延迟 <small>在 X 毫秒后调用停止 URL</small>',
  'Use Record Method': '使用录像方式',
  'Use Substream': '使用子码流',
  'useSubStreamOnlyWhenWatching': '仅在观看时使用子码流',
  'userPermissionsPageText': '在此为管理面板创建权限组。如需把用户加入权限组，请前往“用户账户”页面。',
  'useSystemControlText': '允许此账户从普通控制台打开“系统控制”，以重启 Shinobi、运行更新程序，以及查看或删除系统日志。在此选项出现之前创建的账户默认设为“否”。',
  'usingHomePreset': '正在使用“原位”预设位',
  'videoBuildingText1': '正在生成视频，请稍后再检查。',
  'Windows Share': 'Windows 共享',
  'yourSubscriptionText': '订阅密钥可以解锁 <a href="https://cdn.shinobi.video/installers/ShinobiMobile/" target="_blank"><b>Shinobi Mobile</b></a> 在 iOS 和 Android 上的相关功能。',
  'Allow Next Discord Alert': '允许下一次 Discord 告警 <small>（分钟）</small>',
  'Allow Next Email': '允许下一封电子邮件 <small>（分钟）</small>',
  'Check Signal Interval': '信号检查间隔 <small>（分钟）</small>',
  'Rate': '帧率 <small>（FPS）</small>',
  'Recording Segment Interval': '录像分段间隔 <small>（分钟）</small>',
  'Retry Connection': '重试连接 <small>允许失败的次数</small>',
  'HowToConnectDes1': "<b>此功能仅供移动许可证订阅者使用。</b>如需获取 API 密钥，请登录 <a href='https://licenses.shinobi.video/login' target='_blank'>Shinobi <b>商店</b></a>，并创建一个与<b>任意有效订阅 ID</b> 关联的密钥。<a href='https://hub.shinobi.video/articles/view/3Yhivc6djTtuBPE' target='_blank'>了解更多。</a>",
  'HowToConnectDes2': "如需使用私有（专用）P2P 服务器，请在 <a href='https://licenses.shinobi.video/login' target='_blank'>Shinobi <b>商店</b></a>创建账户，然后通过在线聊天联系我们。",
  'CreateMonitorStateInstructionsText': '<p>预设应在<b>监控设置</b>中创建，而不是在当前页面创建。预设只保存发生变更的设置；通过计划或 API 激活状态时，这些设置会应用到对应监控。</p><ol class="mb-2"><li>打开需要加入预设的监控对应的<b>监控设置</b>。该监控必须已经保存。</li><li>修改需要由预设应用的设置。例如，将<b>检测器 &gt; 启用</b>改为<b>否</b>。不要点击“保存”，因为这些更改属于预设，而不是监控本身。</li><li>点击右下角“保存”按钮旁的<b><i class="fa fa-bars"></i>菜单按钮</b>。</li><li>选择<b>创建新预设</b>，或者选择<b>添加到预设</b>，将该监控加入已有预设。</li><li>窗口会列出并默认勾选所有已更改的设置。取消勾选不需要写入预设的项目；如果是新预设，请输入名称，然后点击<b>保存</b>。</li></ol><p class="mb-0">同一预设需要包含多个监控时，请对每个监控重复以上步骤，并选择<b>添加到预设</b>。如需修改预设中某个监控保存的内容，请重新编辑该监控并再次加入同一预设；原条目会被替换。</p>',
  'NoMonitorStatePresetsSavedText': '尚未创建预设。请按照上面的步骤从“监控设置”创建预设。',
  'triggerGroupRecordFieldText': '输入已经添加到其他监控的标签名称，或者输入准备添加到当前监控的标签名称。',
  'liveGridDescription': '实时画面用于同时显示 Shinobi 的多路视频流，主要面向桌面浏览器。',
  'fieldTextDays': '录像在自动清理前保留的天数。',
  'fieldTextStreamWatermark': '叠加到视频流每一帧上的水印图像。',
  'smtpServerDes': '启动本地 SMTP 服务器，根据收到的电子邮件创建事件，例如接收只支持“移动侦测时发送邮件”的摄像机通知。',
  'dropInEventForceSaveEventDes': '对于来自 Drop-In 事件服务器的触发，无视监控的检测器设置，始终保存对应事件和录像。',
  'clusterUseBasicFrameCount': '集群使用基础帧计数',
  'dockerInContainerHint': '无法直接在当前容器内部启动插件容器。如需从本面板管理插件，请为 Shinobi 挂载宿主机 Docker 套接字（<code>-v /var/run/docker.sock:/var/run/docker.sock</code>），并确保镜像中提供 <code>docker</code> 命令。以这种方式启动的插件容器与 Shinobi 容器同属宿主机，因此下方“主机”字段必须填写宿主机能够访问的地址。',
  'ONVIFnote': '用于查找其他网络中的 ONVIF 设备；留空则扫描当前网络。用户名和密码可以留空。<br>',
  'Center': '居中 <small>URL 地址</small>',
  'CompressTheseMsg': '要压缩这些录像吗？原始录像将移入 FileBin。已经是 WebM 格式的录像会被跳过；已经完成压缩的录像再次加入压缩队列时也会被跳过。',
  'CompressVideoMsg': '要压缩此录像吗？原始录像将移入 FileBin。如果该录像已经完成压缩并已在队列中，则会被跳过。',
  'DeleteMonitorsText': '要删除这些监控吗？删除后无法恢复。可以选择在文件系统中保留这些 ID 对应的文件；以后使用其中任一 ID 重新创建监控时，相关录像和事件会重新显示在控制台中。',
  'DeleteSelectedVideosMsg': '要删除这些录像吗？删除后无法恢复。',
  'DeleteTheseMsg': '要删除这些项目吗？删除后无法恢复。',
  'Disable Night Vision': '关闭夜视 <small>URL 地址</small>',
  'Enable Night Vision': '开启夜视 <small>URL 地址</small>',
  'FileNotExistText': '无法保存不存在的文件，请检查相关文件和路径。',
  'Leave blank for random.': '留空则随机生成。',
  'Leave blank for unlimited': '留空表示不限制',
  'MonitorIdlingText': '已让监控会话进入空闲状态。',
  'MonitorStoppedText': '已停止监控会话。',
  'Up': '向上 <small>URL 地址</small>',
  'Zoom In Stop': '停止放大 <small>URL 地址</small>',
  'Zoom Out Stop': '停止缩小 <small>URL 地址</small>',
  'calendarLimitNoticeText': '当前范围内较早的录像未显示。请缩短时间范围，或只选择一个监控来查看。',
  'centralManagementNotEnabled': '未启用管理服务器连接。请激活此安装，并在 conf.json 中添加 <code>"enableMgmtConnect": true</code>。',
  'deleteApiKey': '删除 API 密钥',
  'failoverHowTo': '故障转移服务器会保持待机，直到当前服务器离线；随后它会接管摄像机和用户，使录像继续进行。当前服务器恢复后，故障期间录制的录像和事件会同步回来。另一台机器的 conf.json 中必须包含 <code>"isFailover": true</code>，并在其超级管理员面板中生成下方要填写的服务器密钥。两台服务器都需要各自的许可证。',
  'fieldTextBufferTimeFromEvent': '触发发生前要保留的录像秒数。如果该时长持续不准确，请查看<a target="_blank" href="https://hub.shinobi.video/articles/view/DmWIID78VtvEfnf">优化指南</a>，或在服务器上强制转码。',
  'fieldTextChannelStreamAcodecLibopus': '用于 WebM 视频。',
  'fieldTextDetailSubstreamInputRtspTransportTCP': '如果使用 UDP 时出现异常，请选择 TCP。',
  'fieldTextDetailSubstreamOutputHlsTime': '每个视频分段的时长，单位为秒。客户端通过 m3u8 文件加载这些分段；分段越短，占用空间越少。',
  'fieldTextDetailSubstreamOutputStreamAcodecLibopus': '用于 WebM 视频。',
  'fieldTextDetectorTrigger': '监控处于“仅观看”模式时，检测到事件后让摄像机开始录像。',
  'fieldTextLoglevelSilent': '不输出任何日志。',
  'fieldTextMapRtspTransportTCP': '如果使用 UDP 时出现异常，请选择 TCP。',
  'fieldTextRtspTransportTCP': '如果使用 UDP 时出现异常，请选择 TCP。',
  'fieldTextStreamAcodecLibopus': '用于 WebM 视频。',
  'makeASelection': '请选择一项后重试。',
  'mountReadWriteHint': '挂载始终以读写模式添加。Shinobi 会把录像写入挂载位置，因此该位置必须可写。',
  'Authenticate': '验证身份',
  'FilterMatchesText1': '此过滤器已满足条件，共找到',
  'FilterMatchesText2': '个录像。',
  'Https': 'Https',
  'deleteOld': 'deleteOld',
  'detectorMergePamRegionTriggers': 'detectorMergePamRegionTriggers',
  'Current': '当前',
  'Current Version': '当前版本',
  'CPU': 'CPU',
  'RAM': '内存',
  'Shinobi': 'Shinobi',
  'ONVIF': 'ONVIF',
  'RTSP': 'RTSP',
  'RTMP': 'RTMP',
  'HTTP': 'HTTP',
  'HTTPS': 'HTTPS',
  'WebDAV': 'WebDAV',
}

const unknownGlossaryKeys = Object.keys(glossary).filter((key) => !Object.hasOwn(source, key))
if (unknownGlossaryKeys.length) {
  throw new Error(`Glossary contains unknown keys: ${unknownGlossaryKeys.join(', ')}`)
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

function translatedTextFromResponse(payload) {
  if (!Array.isArray(payload?.[0])) throw new Error('Unexpected Google Translate response')
  return payload[0].map((part) => part?.[0] || '').join('')
}

async function requestTranslation(markup, attempt = 1) {
  const query = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: 'zh-CN',
    dt: 't',
    q: markup,
  })
  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`, {
      headers: { 'user-agent': 'Shinobi-zh-CN-language-maintainer/1.0' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return translatedTextFromResponse(await response.json())
  } catch (error) {
    if (attempt >= 5) throw error
    await sleep(1000 * 2 ** (attempt - 1))
    return requestTranslation(markup, attempt + 1)
  }
}

function buildBatches(entries, maximumCharacters = 3200) {
  const batches = []
  let batch = []
  let length = 0
  for (const entry of entries) {
    const markup = `<x id="${entry.index}">${entry.value}</x>`
    if (batch.length && length + markup.length > maximumCharacters) {
      batches.push(batch)
      batch = []
      length = 0
    }
    batch.push({ ...entry, markup })
    length += markup.length
  }
  if (batch.length) batches.push(batch)
  return batches
}

function parseBatch(markup, batch) {
  const values = new Map()
  const expression = /<x\s+id=["']?(\d+)["']?>([\s\S]*?)<\/x>/g
  for (const match of markup.matchAll(expression)) values.set(Number(match[1]), match[2])
  if (values.size !== batch.length) {
    throw new Error(`Expected ${batch.length} translated values, received ${values.size}`)
  }
  return values
}

const entries = Object.entries(source).map(([key, value], index) => ({ key, value, index }))
const batches = buildBatches(entries)
const translated = {}

for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
  const batch = batches[batchIndex]
  const markup = batch.map((entry) => entry.markup).join('')
  const translatedMarkup = await requestTranslation(markup)
  const values = parseBatch(translatedMarkup, batch)
  for (const entry of batch) translated[entry.key] = values.get(entry.index)
  await fs.writeFile(pendingPath, `${JSON.stringify(translated, null, 2)}\n`)
  process.stdout.write(`\rTranslated ${Object.keys(translated).length}/${entries.length}`)
  await sleep(250)
}

for (const key of Object.keys(translated)) {
  translated[key] = translated[key]
    .replaceAll('帐户', '账户')
    .replaceAll('监视器', '监控')
    .replaceAll('摄像头', '摄像机')
    .replaceAll('仪表板', '控制台')
    .replaceAll('运动检测', '移动侦测')
    .replaceAll('忍者', 'Shinobi')
    .replaceAll('不和谐', 'Discord')
    .replaceAll('禁止行动', '无移动侦测')
    .replaceAll('外壳中运行', 'shell 中运行')
    .replaceAll('视频流媒体', '视频流')
    .replaceAll('蒙太奇', '画面拼接')
    .replaceAll('FFMPEG', 'FFmpeg')

  const sourceText = source[key]
  if (/\bMonitors?\b/i.test(sourceText)) translated[key] = translated[key].replaceAll('显示器', '监控')
  if (/\bCameras?\b/i.test(sourceText)) translated[key] = translated[key].replaceAll('相机', '摄像机')
  if (/\b(Motion|Motionless)\b/i.test(sourceText)) {
    translated[key] = translated[key].replaceAll('运动', '移动侦测').replaceAll('动作', '移动侦测')
  }
  if (/\bStreams?\b/i.test(sourceText)) {
    translated[key] = translated[key]
      .replaceAll('直播', '实时视频流')
      .replaceAll('串流', '视频流')
      .replaceAll('码流', '视频流')
      .replace(/(?<!视频|音频|数据|工作)流(?!程|量|式)/g, '视频流')
  }
  if (/\b(Detector|Detection)\b/i.test(sourceText)) {
    translated[key] = translated[key].replaceAll('探测器', '检测器').replaceAll('探测', '检测')
  }
  if (/\bEvents?\b/i.test(sourceText)) translated[key] = translated[key].replaceAll('活动', '事件')
  if (/\b(Alarms?|Alerts?)\b/i.test(sourceText)) {
    translated[key] = translated[key].replaceAll('闹钟', '告警').replaceAll('警报', '告警')
  }
  if (/\bSchedules?\b/i.test(sourceText)) translated[key] = translated[key].replaceAll('时间表', '计划')
  if (/\bTags?\b/i.test(sourceText)) translated[key] = translated[key].replaceAll('标记', '标签')
  if (/\bFeeds?\b/i.test(sourceText)) translated[key] = translated[key].replaceAll('Feed', '输入源').replaceAll('饲料', '输入源')
  if (/\bFaces?\b/i.test(sourceText)) translated[key] = translated[key].replaceAll('面孔', '人脸')
  if (/\bFrames?\b/i.test(sourceText)) translated[key] = translated[key].replaceAll('框架', '帧')
  if (/\bLive\b/i.test(sourceText)) translated[key] = translated[key].replaceAll('直播', '实时')
  if (/\bArchive(d|s)?\b/i.test(sourceText)) translated[key] = translated[key].replaceAll('存档', '归档')
  if (/\bSubstreams?\b/i.test(sourceText)) translated[key] = translated[key].replaceAll('子流', '子码流')
  if (/\bDrop-In\b/i.test(sourceText)) translated[key] = translated[key].replaceAll('插入', 'Drop-In')
  if (/\bMount(s|ing)?\b/i.test(sourceText) || /mount/i.test(key)) {
    translated[key] = translated[key].replaceAll('安装', '挂载').replaceAll('装载', '挂载')
  }
}

for (const [key, value] of Object.entries(glossary)) {
  if (Object.hasOwn(source, key)) translated[key] = value
}

const ordered = Object.fromEntries(Object.keys(source).sort().map((key) => [key, translated[key]]))
const missing = Object.keys(source).filter((key) => typeof ordered[key] !== 'string' || ordered[key] === '')
if (missing.length) throw new Error(`Missing translations: ${missing.join(', ')}`)

await fs.writeFile(targetPath, `${JSON.stringify(ordered, null, 2)}\n`)
await fs.rm(pendingPath, { force: true })
console.log(`\nWrote ${Object.keys(ordered).length} translations to ${targetPath}`)
