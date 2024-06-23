'use client'
import * as React from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Textarea from '@mui/joy/Textarea';
import Stack from '@mui/joy/Stack';
import { open } from "@tauri-apps/api/dialog"
import { readTextFile } from "@tauri-apps/api/fs"
import { AuthContext } from '@/provider/AuthProvider';
import { InfoContext } from '@/provider/InfoProvider';


function VerifyBattery() {
    const [carNumListStr, setCarNumListStr] = React.useState('')
    const [batteryNoListStr, setBatteryNoListStr] = React.useState('')
    const token = React.useContext(AuthContext)
    const { cardInfoList, batteryList } = React.useContext(InfoContext)
    const verify = async () => {
        // verifyBattery
        // 验证逻辑
        const response = await fetch('/api/verifyBattery', {
            method: 'POST',
            body: JSON.stringify({
                carNumListStr,
                batteryNoListStr
            }),
            headers: {
                'Content-Type': 'application/json',
            },
        })
        const { data, code } = await response.json()
        if (code === 0) {
            console.log(data)
        }
    }

    const carNumListLength = React.useMemo(() => {
        const carNumList = carNumListStr.split('\n').filter(Boolean)
        return carNumList.length
    }, [carNumListStr])

    const batteryNoListLength = React.useMemo(() => {
        const batteryNoList = batteryNoListStr.split('\n').filter(Boolean)
        return batteryNoList.length
    }, [batteryNoListStr])

    const autoSyncCarNum = async () => {
        console.log(cardInfoList, 'cardInfoList')
        const str = cardInfoList.map(it => it.value).join('\n')
        setCarNumListStr(str)
    }

    const autoSyncBatteryNo = async () => {
        const str = batteryList.map(it => it.value).join('\n')
        setBatteryNoListStr(str)
    }

    const importBatteryNo = async () => {
        const text = await getFileText()
        console.log(text, 'text2')
        setBatteryNoListStr(text)
    }
    const importCarNum = async () => {
        const text = await getFileText()
        console.log(text, 'text1')
        setCarNumListStr(text)
    }

    async function getFileText() {
        let filePath = await open({
            filters: [
                {
                    name: 'txt',
                    extensions: ['txt'],
                },
            ],
            multiple: false,
        })
        if (!filePath) return ''
        return await readTextFile(filePath as string)
    }

    return (
        <Stack spacing={2}>
            <form>
                <Stack direction="row" spacing={2}>
                    <FormControl sx={{ flex: '1' }}>
                        <FormLabel>车架号</FormLabel>
                        <Textarea
                            placeholder="直接填写车架号或者导入车架号txt文件"
                            minRows={3}
                            maxRows={10}
                            value={carNumListStr}
                            onChange={(e) => setCarNumListStr(e.target.value)}
                            endDecorator={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        gap: 'var(--Textarea-paddingBlock)',
                                        pt: 'var(--Textarea-paddingBlock)',
                                        borderTop: '1px solid',
                                        borderColor: 'divider',
                                        flex: 'auto',
                                    }}
                                >
                                    {`当前有：${carNumListLength}个`}
                                    {cardInfoList.length && <Button sx={{ ml: 'auto' }} onClick={autoSyncCarNum}>自动获取车架号</Button>}
                                    <Button sx={{ ml: 'auto' }} onClick={importCarNum}>
                                        <label htmlFor="file-upload">
                                            导入车架号
                                        </label>
                                    </Button>
                                </Box>
                            }
                        />
                    </FormControl>
                    <FormControl sx={{ flex: '1' }}>
                        <FormLabel>电池码</FormLabel>
                        <Textarea
                            placeholder="直接填写电池码或者导入电池码txt文件"
                            minRows={3}
                            maxRows={10}
                            value={batteryNoListStr}
                            onChange={(e) => setBatteryNoListStr(e.target.value)}
                            endDecorator={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        gap: 'var(--Textarea-paddingBlock)',
                                        pt: 'var(--Textarea-paddingBlock)',
                                        borderTop: '1px solid',
                                        borderColor: 'divider',
                                        flex: 'auto',
                                    }}
                                >
                                    {`当前有：${batteryNoListLength}个`}
                                    {batteryList.length && <Button sx={{ ml: 'auto' }} onClick={autoSyncBatteryNo}>自动获取电池码</Button>}
                                    <Button sx={{ ml: 'auto' }} onClick={importBatteryNo}>
                                        <label htmlFor="file-upload">
                                            导入电池码
                                        </label>
                                    </Button>
                                </Box>
                            }
                            sx={{
                                minWidth: 300,
                            }}
                        />
                    </FormControl>
                </Stack>
            </form>
            <Button
                sx={{
                    mt: 'var(--Card-paddingBlock)',
                }}
                onClick={verify}
                disabled={!carNumListStr || !batteryNoListStr}
                fullWidth
                color="primary"
            >验证</Button>
        </Stack>
    );
}
export default VerifyBattery;
