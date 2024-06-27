import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

interface Device {
    deviceId: string;
    enabled: boolean;
}

// 定义数据文件的路径
const dataFilePath = path.join(process.cwd(), 'data', 'devices.json');

// 辅助函数：读取数据文件
const readData = (): Device[] => {
    try {
        // 没有文件夹则创建
        if (!fs.existsSync(path.dirname(dataFilePath))) {
            fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
        }
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

// 辅助函数：写入数据文件
const writeData = (data: Device[]) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
};

// GET 请求处理函数
export const GET = async (req: NextRequest) => {
    const devices = readData();
    return NextResponse.json({ code: 0, devices }, { status: 200 });
};

// POST 请求处理函数
export const POST = async (req: NextRequest) => {
    try {
        const { deviceId, enabled } = await req.json() as Device;
        const currentData = readData();
        const newDevice = { deviceId, enabled };
        currentData.push(newDevice);
        writeData(currentData);
        return NextResponse.json({ code: 0, devices: currentData }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ code: 1, message: 'Error processing POST request' }, { status: 500 });
    }
};

// PUT 请求处理函数
export const PUT = async (req: NextRequest) => {
    try {
        const { deviceId: updateDeviceId, enabled: updateEnabled } = await req.json() as Device;
        let dataToUpdate = readData();
        dataToUpdate = dataToUpdate.map((device: Device) =>
            device.deviceId === updateDeviceId ? { ...device, enabled: updateEnabled } : device
        );
        writeData(dataToUpdate);
        return NextResponse.json({ code: 0, devices: dataToUpdate }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ code: 1, message: 'Error processing PUT request' }, { status: 500 });
    }
};

// DELETE 请求处理函数
export const DELETE = async (req: NextRequest) => {
    try {
        const { deviceId: deleteDeviceId } = await req.json() as Device;
        let dataToDelete = readData();
        dataToDelete = dataToDelete.filter((device: Device) => device.deviceId !== deleteDeviceId);
        writeData(dataToDelete);
        return NextResponse.json({ code: 0 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ code: 1, message: 'Error processing DELETE request' }, { status: 500 });
    }
};
