import type { Room } from '../types'

export const DORM_NAME = 'หอพักสมใจ'
export const DORM_ADDRESS = '133 หมู่ 2 ตำบลเมืองเดช อำเภอเดชอุดม จังหวัดอุบลราชธานี 34160'
export const ELECTRICITY_UNIT_PRICE = 6

const buildingA: Room[] = Array.from({ length: 7 }, (_, index) => ({
  id: `A${index + 1}`,
  building: 'A',
  number: index + 1,
  monthlyRent: 1600,
}))

const buildingB: Room[] = Array.from({ length: 9 }, (_, index) => {
  const roomNumber = index + 1
  const discountedRoom = roomNumber === 6 || roomNumber === 8

  return {
    id: `B${roomNumber}`,
    building: 'B',
    number: roomNumber,
    monthlyRent: discountedRoom ? 2000 : 2500,
  }
})

export const ROOMS: Room[] = [...buildingA, ...buildingB]

export const ROOM_IDS = ROOMS.map((room) => room.id)

export function getRoomById(roomId: string): Room | undefined {
  return ROOMS.find((room) => room.id === roomId)
}
