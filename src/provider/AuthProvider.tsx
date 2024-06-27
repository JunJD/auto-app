"use client"

import appStorage from "@/utils/appStorage";
import { createContext, useEffect, useRef, useState } from "react"
import * as CryptoJS from 'crypto'
import { Button } from "@mui/joy";
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
    const [deviceId, setDeviceId] = useState<string>('')
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

    useEffect(() => {
        const d = devices.find((device) => {
            return (deviceId ?? appStorage.getItem("deviceId")) === device.deviceId && device.enabled
        })
        console.log(d, 'd')
        if (!d) {
            setDeviceId(appStorage.getItem("deviceId") ?? '')
        } else {
            appStorage.setItem("deviceId", deviceId)
        }
    }, [devices, deviceId])

    function inputDevice() {
        const id = prompt('message')
        setDeviceId(id ?? '')
    }

    async function getData() {
        // const response = await fetch('https://autoappzhouer.dingjunjie.com/api/devices', {
        const response = await fetch('/api/devices', {
            method: "GET"
        })
        const result = await response.json()
        if (result.code === 0) {
            setDevices(result.devices)
            setDevices(result.devices);
        }
    }

    async function autoLogin() {
        const md5Hash = CryptoJS.createHash('md5').update("zhou200266..").digest('hex');
        const response = await fetch('https://autoappzhouer.dingjunjie.com/api/login', {
            method: "POST",
            body: JSON.stringify({ usercode: '城南浩子', password: md5Hash }),
        })
        const result = await response.json()
        if (result.code === 0) {
            setToken(result.data)
        }
    }

    function _setToken(token: string) {
        appStorage.setItem("token", token)
        setToken(token)
    }

    // 获取当前路径
    const path = window.location.pathname
    // 路径包含background，直接通过
    if (path.includes('background')) return <>{children}</>
    if (!deviceId) return <Button onClick={inputDevice}>请输入设备号</Button>

    return (
        <AuthContext.Provider value={{ token, setToken: _setToken }}>
            {children}
        </AuthContext.Provider>
    )
}