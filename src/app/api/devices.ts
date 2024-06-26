import fs from 'fs';
import path from 'path';
import { NextResponse } from "next/server"
interface Device {
    deviceId: string;
    enabled: boolean;
}

// 定义数据文件的路径
const dataFilePath = path.join(process.cwd(), 'data', 'devices.json');

// 辅助函数：读取数据文件
const readData = () => {
  try {
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

export default function handler(req: Request) {
  const { method, body } = req;

  switch (method) {
    case 'GET':
      // 读取数据并返回
      const devices = readData();
    //   res.status(200).json(devices);
      return NextResponse.json({ code: 0, devices }, { status: 200 })

    case 'POST':
      // 添加新设备
      const { deviceId, enabled } = body as unknown as Device;
      const currentData = readData();
      const newDevice = { deviceId, enabled };
      currentData.push(newDevice);
      writeData(currentData);
      return NextResponse.json({ code: 0 }, { status: 200 })

    case 'PUT':
      // 更新设备启用状态
      const { deviceId: updateDeviceId, enabled: updateEnabled } = body as unknown as Device;
      let dataToUpdate = readData();
      dataToUpdate = dataToUpdate.map((device: Device) =>
        device.deviceId === updateDeviceId ? { ...device, enabled: updateEnabled } : device
      );
      writeData(dataToUpdate);
      return NextResponse.json({ code: 0 }, { status: 200 })

    case 'DELETE':
      // 删除设备
      const { deviceId: deleteDeviceId } = body as unknown as Device;
      let dataToDelete = readData();
      dataToDelete = dataToDelete.filter((device: Device) => device.deviceId !== deleteDeviceId);
      writeData(dataToDelete);
      return NextResponse.json({ code: 0 }, { status: 200 })
    default:
        return NextResponse.json({ code: 1 }, { status: 200 })
        //   res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    //   res.status(405).end(`Method ${method} Not Allowed`);
  }
}
