"use client"

import appStorage from "@/utils/appStorage";
import { createContext, useEffect, useRef, useState } from "react"
import * as CryptoJS from 'crypto'
import { Button, Input, Stack } from "@mui/joy";
import Login from "@/components/login";
import { customFetch as fetch } from '@/utils/FetchQueue';
interface Row {
    deviceId: string;
    enabled: boolean;
}

export const AuthContext = createContext<
    {
        token: string,
        setToken: (token: string) => void
    }
>({
    token: "",
    setToken: () => { }
})

export default function AuthProvider({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [token, setToken] = useState<string>(appStorage.getItem("token") || "")
    const [deviceId, setDeviceId] = useState<string>(appStorage.getItem("deviceId") || "")
    const [devices, setDevices] = useState<Row[]>([])
    const firstRef = useRef(true)

    useEffect(() => {
        // 初始化时自动登录
        if (firstRef.current) {
            getData()
            autoLogin()
        }
        return () => {
            firstRef.current = false
        }
    })

    async function getData() {
        const response: any = await fetch('https://autonginx1.dingjunjie.com/api/devices', {
            // const response = await fetch('/api/devices', {
            method: "GET"
        })
        const result = await response.json()
        setDevices(result.devices)
        if (result.code === 0) {
            const d = result.devices.find((device: any) => {
                return deviceId === device.deviceId && device.enabled
            })
            if (!d) {
                setDeviceId('')
                appStorage.setItem("deviceId", '')
            } else {
                setDeviceId(deviceId)
                appStorage.setItem("deviceId", deviceId)
            }
        }
    }

    async function autoLogin(
        usercode: string = localStorage.getItem('usercode') ?? '城南浩子',
        password: string = localStorage.getItem('password') ?? "zhou200266.."
    ) {
        const md5Hash = CryptoJS.createHash('md5').update(password).digest('hex');
        // 构造URL并添加查询参数
        const queryParams = new URLSearchParams({ usercode, password: md5Hash, city: '0573' }).toString();
        const response: any = await fetch(`https://jgjfjdcgl.gat.zj.gov.cn:5102/inf_zpm/hz_mysql_api/BatteryBinding/login?${queryParams}`, {
            method: "GET",
        })
        if (response.ok) {
            const result = response.data

            if (response.ok && result.code === 0) {
                setToken(result.data)
            }
        }
    }

    function _setToken(token: string) {
        appStorage.setItem("token", token)
        setToken(token)
    }

    function onSubmit({
        usercode,
        password,
    }: any) {
        autoLogin(usercode, password)
    }

    if (!deviceId) return (
        <>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const deviceId = formData.get("deviceId") as string;
                    const d = devices.find((device: any) => {
                        return deviceId === device.deviceId && device.enabled
                    })
                    if (!d) {
                        setDeviceId('')
                        appStorage.setItem("deviceId", '')
                    } else {
                        setDeviceId(deviceId)
                        appStorage.setItem("deviceId", deviceId)
                    }
                }}
            >
                <Stack spacing={1}>
                    <Input placeholder="请输入设备号" name="deviceId" />
                    <Button type="submit" >确定设备号</Button>
                </Stack>
            </form>
        </>
    )

    if (!token) {
        return (
            <Login onSubmit={onSubmit} />
        )
    }

    return (
        <AuthContext.Provider value={{ token, setToken: _setToken }}>
            {children}
        </AuthContext.Provider>
    )
}
