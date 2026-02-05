class BmapPoint {
  private lng: number // 经度
  private lat: number // 纬度

  constructor(lng: number, lat: number) {
    this.lng = lng
    this.lat = lat
  }

  equals(obj: any): boolean {
    if (obj instanceof BmapPoint) {
      return obj.getLng() === this.lng && obj.getLat() === this.lat
    }
    return false
  }

  public getLat(): number {
    return this.lat
  }

  public getLng(): number {
    return this.lng
  }
}

/**
 * 根据地图边界坐标，获取能包括住整个地图边界的矩形
 * @param mapJson
 */
export function getMapWrapper(mapJson: any): any {
  if (!mapJson) {
    return mapJson
  }

  if (Array.isArray(mapJson?.features)) {
    const allPoints: BmapPoint[] = mapJson.features.reduce((res: BmapPoint[], feature: any) => {
      if (feature?.geometry && Array.isArray(feature?.geometry?.coordinates)) {
        const points = transformCoordinates2BmapPoints(feature?.geometry?.coordinates)

        res.push(...points)
      }
      return res
    }, [])

    if (allPoints.length > 2) {
      const firstFeature = mapJson.features[0]
      const boundPoints = getRectangle(allPoints)

      return {
        ...mapJson,
        features: [
          {
            ...firstFeature,
            geometry: {
              type: 'Polygon',
              coordinates: [boundPoints.map(point => [point.getLng(), point.getLat()])],
            },
          },
        ],
      }
    }
  }

  return null
}

function transformCoordinates2BmapPoints(coordinates: any): BmapPoint[] {
  if (!Array.isArray(coordinates) || !coordinates.length) {
    return []
  }

  const res: BmapPoint[] = []

  if (Array.isArray(coordinates[0])) {
    for (const c of coordinates) {
      res.push(...transformCoordinates2BmapPoints(c))
    }
  } else if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    res.push(new BmapPoint(coordinates[0], coordinates[1]))
  }

  return res
}

export function getRectangle(boundaryPoints: BmapPoint[]): BmapPoint[] {
  const southWestPoint: BmapPoint = getSouthWestPoint(boundaryPoints) // 西南角点
  const northEastPoint: BmapPoint = getNorthEastPoint(boundaryPoints) // 东北角点
  const northWestPoint: BmapPoint = new BmapPoint(southWestPoint.getLng(), northEastPoint.getLat()) // 西北角
  const southEastPoint: BmapPoint = new BmapPoint(northEastPoint.getLng(), southWestPoint.getLat()) // 东南角

  return [
    /**西北角 */ northWestPoint,
    /**东北角 */ northEastPoint,
    /**东南角 */ southEastPoint,
    /**西南角 */ southWestPoint,
  ]
}

/**
 * 根据这组坐标，画一个矩形，然后得到这个矩形西南角的顶点坐标
 *
 * @param vertexs 点坐标集合
 * @return 定点坐标
 */
function getSouthWestPoint(vertexs: BmapPoint[]): BmapPoint {
  let minLng = vertexs[0].getLng()
  let minLat = vertexs[0].getLat()
  for (const bmapPoint of vertexs) {
    const lng = bmapPoint.getLng()
    const lat = bmapPoint.getLat()
    if (lng < minLng) {
      minLng = lng
    }
    if (lat < minLat) {
      minLat = lat
    }
  }
  return new BmapPoint(minLng, minLat)
}

/**
 * 根据这组坐标，画一个矩形，然后得到这个矩形东北角的顶点坐标
 *
 * @param vertexs 点坐标集合
 * @return 定点坐标
 */
function getNorthEastPoint(vertexs: BmapPoint[]): BmapPoint {
  let maxLng = 0
  let maxLat = 0
  for (const bmapPoint of vertexs) {
    const lng = bmapPoint.getLng()
    const lat = bmapPoint.getLat()
    if (lng > maxLng) {
      maxLng = lng
    }
    if (lat > maxLat) {
      maxLat = lat
    }
  }
  return new BmapPoint(maxLng, maxLat)
}
