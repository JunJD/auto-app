"use client"

import appStorage from "@/utils/appStorage";
import { createContext, useEffect, useRef, useState } from "react"
import * as CryptoJS from 'crypto'
export const AuthContext = createContext<
    {
        token: string,
        setToken: (token: string) => void
    }
>({
    token: "",
    setToken: () => {}
})

export default function AuthProvider({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [token, setToken] = useState<string>(appStorage.getItem("token") || "")
    
    const firstRef = useRef(true)

    useEffect(()=>{
        // 初始化时自动登录
        if(firstRef.current) {
            autoLogin()
        }
        return () => {
            firstRef.current = false
        }
    })

    async function autoLogin () {
        const md5Hash = CryptoJS.createHash('md5').update("zhou200266..").digest('hex');
        const response = await fetch('https://autonginx1.dingjunjie.com/api/login', {
            method: "POST",
            body: JSON.stringify({ usercode: '城南浩子', password: md5Hash }),
        })
        const result = await response.json()
        if (result.code === 0) {
            setToken(result.data)
        }
    }

    function _setToken (token: string) {
        appStorage.setItem("token", token)
        setToken(token)
    }
    
    return (
        <AuthContext.Provider value={{ token, setToken: _setToken }}>
            {children}
        </AuthContext.Provider>
    )
}