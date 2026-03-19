package com.citc.editor.common.util;


import com.pty4j.PtyProcess;
import com.pty4j.PtyProcessBuilder;
import com.pty4j.WinSize;
import lombok.extern.slf4j.Slf4j;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * @Description : 终端命令工具类
 * @Author yzb
 * @Date 2025年04月08日
 */
@Slf4j
public class CommandUtil {

    private PtyProcess ptyProcess;
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private PrintWriter outputWriter;
    private final TerminalOutputListener outputListener;

    /**
     * 是否是密码输入状态
     */
    private boolean isPasswordInput = false;

    public interface TerminalOutputListener {
        void onOutput(String output);

        void onExit(int exitCode);
    }

    public CommandUtil(TerminalOutputListener listener) {
        this.outputListener = listener;
    }

    /**
     * 启动终端进程
     * @author yzb
     * @date 2025/4/8
     */
    public void start() throws IOException {
        // 1. 创建PTY进程
        String[] command = getPlatformShellCommand();
        HashMap<String, String> envs = new HashMap<>(System.getenv());
        envs.put("TERM", "xterm-256color"); // 设置终端类型
        // 添加字符编码环境变量
        envs.put("LANG", "zh_CN.UTF-8");
        envs.put("LC_ALL", "zh_CN.UTF-8");

        ptyProcess = new PtyProcessBuilder()
                .setCommand(command)
                .setEnvironment(envs)
                .setInitialColumns(80).setInitialRows(24) // 初始窗口大小
                .start();

        // 2. 初始化输入输出流
        outputWriter = new PrintWriter(new OutputStreamWriter(ptyProcess.getOutputStream(), StandardCharsets.UTF_8));

        // 3. 启动输出读取线程
        executor.submit(() -> readStream(ptyProcess.getInputStream()));
        executor.submit(() -> readStream(ptyProcess.getErrorStream()));

        // 4. 监听进程退出
        executor.submit(() -> {
            try {
                int exitCode = ptyProcess.waitFor();
                if (outputListener != null) {
                    outputListener.onExit(exitCode);
                }
                shutdown();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
    }

    /**
     * 获取平台默认的shell命令
     * @author yzb
     * @date 2025/4/8
     */
    private String[] getPlatformShellCommand() {
        String osName = System.getProperty("os.name").toLowerCase();
        if (osName.contains("win")) {
            return new String[]{"cmd.exe"};
        } else {
            return new String[]{"/bin/bash", "--login"};
        }
    }

    /**
     * 读取输入流
     * @param inputStream 输入流
     * @author yzb
     * @date 2025/4/8
     */
    private void readStream(InputStream inputStream) {
        log.info("开始读取终端输出");
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            char[] buffer = new char[1024];
            int read;
            while ((read = reader.read(buffer)) != -1) {
                if (outputListener != null) {
                    String output = new String(buffer, 0, read);
                    log.info("终端输出: {}", output);

                    // 先处理控制序列
//					String cleanOutput = cleanTerminalOutput(output);
                    String cleanOutput = output;

                    // 检测密码提示并设置状态
                    if (!isPasswordInput && (cleanOutput.contains("password:") || cleanOutput.contains("密码："))) {
                        log.info("检测到密码输入提示");
                        isPasswordInput = true;
                        outputListener.onOutput(cleanOutput);
                        continue;
                    }

                    // 处理密码输入
                    if (isPasswordInput) {
                        log.info("正在处理密码输入");
                        // 如果包含实际输入内容（非空白字符）
                        if (cleanOutput.matches(".*[^\\s\\n\\r].*")) {
                            cleanOutput = cleanOutput.replaceAll(".", "*");
                        }
                        // 检测密码输入完成
                        if (cleanOutput.contains("\n") || cleanOutput.contains("\r")) {
                            isPasswordInput = false;
                        }
                    }

//                    if (!cleanOutput.trim().isEmpty()) {
                    outputListener.onOutput(cleanOutput);
                    log.info("输出内容: {}", cleanOutput);
//                    }
                }
            }
        } catch (IOException e) {
            if (outputListener != null) {
                outputListener.onOutput("读取终端输出时发生错误: " + e.getMessage() + "\n");
                log.info("读取终端输出时发生错误: " + e.getMessage() + "\n");
            }
            // 如果不是因为进程终止导致的IO异常，则关闭进程
            if (isProcessAlive()) {
                shutdown();
            }
        } finally {
            try {
                if (inputStream != null) {
                    inputStream.close();
                }
            } catch (IOException e) {
                if (outputListener != null) {
                    outputListener.onOutput("关闭输入流时发生错误: " + e.getMessage() + "\n");
                    log.info("关闭输入流时发生错误: " + e.getMessage() + "\n");
                }
            }
        }
    }

    /**
     * 判断进程是否存活
     * @author yzb
     * @date 2025/4/8
     */
    private boolean isProcessAlive() {
        return ptyProcess != null && ptyProcess.isAlive();
    }


    /**
     * 更精确地处理终端控制序列
     * @param output 原始输出
     * @author yzb
     * @date 2025/4/8
     */
    private String cleanTerminalOutput(String output) {
        String cleanOutput = output;
        cleanOutput = cleanOutput.replaceAll("\\x1B\\]0;.*?\\x07", "");
        cleanOutput = cleanOutput.replaceAll("\u001B\\[\\??\\d*[\\d;]*[A-Za-z]", "");
        cleanOutput = cleanOutput.replaceAll("\\[\\d*[A-Z]", "");
        cleanOutput = cleanOutput.replaceAll("\\[\\?\\d+[hl]", "");
//		cleanOutput = cleanOutput.replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", "");
        return cleanOutput;
    }

    public void resizeTerminal(int cols, int rows) {
        if (isProcessAlive()) {
            ptyProcess.setWinSize(new WinSize(cols, rows));
        }
    }

    /**
     * 发送输入到终端
     * @param input 输入内容
     * @author yzb
     * @date 2025/4/8
     */
    public void sendInput(String input) {
        if (outputWriter != null) {
            outputWriter.write(input);
            outputWriter.flush();
        }

    }

    /**
     * 关闭终端进程
     * @author yzb
     * @date 2025/4/8
     */
    public void shutdown() {
        if (ptyProcess != null) {
            ptyProcess.destroy();
        }
        executor.shutdownNow();
    }
}
