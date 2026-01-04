/*********************************************************************************************
**                                                                                          **
** 测试系统能创建多少个 socket（资源限制）。
**
********************************************************************************************/
#ifdef WIN32
#include <windows.h>
#else
#include <sys/types.h>
#include <sys/socket.h>
#include <unistd.h>
#define  closesocket close
#endif
#include <stdio.h>

int main(int argc,char *argv[])
{
#ifdef WIN32
	WSADATA ws;
	// 初始化 Winsock
	// 请求使用 Winsock 2.2 版本
	// &ws 用于接收 Winsock 初始化后的信息(如版本、描述等）
	WSAStartup(MAKEWORD(2, 2), &ws);
#endif
	// 
	for (int i = 0; i < 2000; i++)
	{
		// 创建一个 TCP 套接字
		// AF_INET 指定使用 IPv4 协议, SOCK_STREAM 表示使用 TCP.
		int sock = socket(AF_INET, SOCK_STREAM, 0);
		if (sock == -1)
		{
			printf("create socket failed!\n");
			return -1;
		}
		printf("[%d]", sock);
		// 省略 socket 连接、发送数据等操作
		// ======================================
		// ======================================
		// 关闭 socket，释放资源
		// closesocket(sock);
	}
	getchar();
	return 0;
}