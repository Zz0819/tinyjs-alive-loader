'use strict';

const alive2json = require('./alive2json');

module.exports = (source) => {
  const lottieJSON = JSON.parse(source);
  const aliveJSON = lottie2alive(lottieJSON);
  const animationConfig = alive2json(aliveJSON);
  return animationConfig;
}

/**
 * @param {*} lottieJSON
 * @param {lottieJSON.v} bodymovin插件版本
 * @param {lottieJSON.fr} 帧率
 * @param {lottieJSON.ip} 起始关键帧
 * @param {lottieJSON.op} 结束关键帧
 * @param {lottieJSON.w} 视图宽度
 * @param {lottieJSON.h} 视图高度
 * @param {lottieJSON.nm} 动画名称
 * @param {lottieJSON.ddd} 是否是3D
 * @param {lottieJSON.layers} 图层集合
 * @param {lottieJSON.assets} 资源集合
**/
function lottie2alive(lottieJSON) {
  const { fr, assets } = lottieJSON;
  const frameTime = 1000 / fr;
  const movieClips = [];
  let globalIndex = 0;

  // 优先选择 assets 对象里的 layer 数据
  let layers = [];
  assets.forEach(asset => {
    if(asset.layers && asset.layers.length) {
      asset.layers.forEach(layer => {
        layers.push(layer);
      });
    }
  });

  if(!layers.length) layers = lottieJSON.layers || [];

  const animationNameMap = {
    p: {
      name: '移动',
      type: 'move',
    },
    s: {
      name: '缩放',
      type: 'scale',
    },
    o: {
      name: '透明度',
      type: 'opacity',
    },
  };

  /**
   * @param {Object} layer
   * @param {layer.ddd} 是否是3D
   * @param {layer.ind} 在AE里的图层标序号
   * @param {layer.ty} 图层类型(0:预合成层,1:固态层,2:图片层,3:空层,4:形状层,5:位置层)
   * @param {layer.nm} 在AE下的命名
   * @param {layer.refId} 引用资源ID
   * @param {layer.ks} 动画属性值
   *
   * @param {Object} ks(p:移动,s:缩放,o:透明度,r:旋转,a:锚点)
   * @param {ks.a}
   * @param {ks.k} 属性值或带帧动画，如果k是数组类型并且数组第一个对象t有值则是带帧动画
   * @param {ks.ix}
   *
   * @param {Array} k
   * @param {k.a}
   * @param {k.o} 贝塞尔缓冲函数的控制点
   * @param {k.t} 关键帧
   * @param {k.s} 关键帧对应的初始值
   **/
  layers.forEach(layer => {
    const { nm: name, ks: animation, refId } = layer;
    const asset = assets.find(asset => asset.id === refId);
    const effectsGroup = [];
    const style = {
      width: asset.w || 0,
      height: asset.h || 0,
      left: 0,
      top: 0,
      opacity: 1,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
    };

    for (const k in animation) {
      const animationName = k;
      const animationValue = animation[k];
      const effects = [];

      if (animationValue.k && animationValue.k.length > 0) {
        const animationValueArray = animationValue.k;

        switch (animationName) {
          case 'p': {
            let anchorX = 0;
            let anchorY = 0;

            if (typeof animation.a.k[0] === 'object') {
              anchorX = animation.a.k[0].s[0];
              anchorY = animation.a.k[0].s[1];
            } else if (typeof animation.a.k[0] === 'number') {
              anchorX = animation.a.k[0];
              anchorY = animation.a.k[1];
            }

            if (typeof animationValueArray[0] === 'object') {
              style.left = animationValueArray[0].s[0] - anchorX;
              style.top = animationValueArray[0].s[1] - anchorY;
            } else if (typeof animationValueArray[0] === 'number') {
              style.left = animationValueArray[0] - anchorX;
              style.top = animationValueArray[1] - anchorY;
            }

            animationValueArray.reduce((beforeVal, currentVal, idx) => {
              if (typeof beforeVal === 'object' || typeof currentVal === 'object') {
                const result = {
                  name: `${animationNameMap[animationName].name}_${idx}`,
                  val: {
                    x: currentVal.s[0] - anchorX,
                    y: currentVal.s[1] - anchorY,
                  },
                  type: animationNameMap[animationName].type,
                  delay: !idx ? (beforeVal.t * frameTime) : 0,
                  duration: (currentVal.t - beforeVal.t) * frameTime,
                  easing: 'easeInOutCubic',
                };
                effects.push(result);
              }
              return currentVal;
            });

            break;
          }

          case 's': {
            if (typeof animationValueArray[0] === 'object') {
              style.scaleX = animationValueArray[0].s[0] / 100;
              style.scaleY = animationValueArray[0].s[1] / 100;
            } else if (typeof animationValueArray[0] === 'number') {
              style.scaleX = animationValueArray[0] / 100;
              style.scaleY = animationValueArray[1] / 100;
            }

            animationValueArray.reduce((beforeVal, currentVal, idx) => {
              if (typeof beforeVal === 'object' || typeof currentVal === 'object') {
                const result = {
                  name: `${animationNameMap[animationName].name}_${idx - 1}`,
                  val: {
                    scaleX: currentVal.s[0] / 100,
                    scaleY: currentVal.s[1] / 100,
                  },
                  type: animationNameMap[animationName].type,
                  delay: !idx ? (beforeVal.t * frameTime) : 0,
                  duration: (currentVal.t - beforeVal.t) * frameTime,
                  easing: 'easeInOutCubic',
                };
                effects.push(result);
              }
              return currentVal;
            });
            break;
          }

          case 'o': {
            if (typeof animationValueArray[0] === 'object') {
              style.opacity = animationValueArray[0].s[0] / 100;
            } else if (typeof animationValueArray[0] === 'number') {
              style.opacity = animationValueArray[0] / 100;
            }

            animationValueArray.reduce((beforeVal, currentVal, idx) => {
              if (typeof beforeVal === 'object' || typeof currentVal === 'object') {
                const result = {
                  name: `${animationNameMap[animationName].name}_${idx - 1}`,
                  val: currentVal.s[0] / 100,
                  type: animationNameMap[animationName].type,
                  delay: !idx ? (beforeVal.t * frameTime) : 0,
                  duration: (currentVal.t - beforeVal.t) * frameTime,
                  easing: 'easeInOutCubic',
                };
                effects.push(result);
              }
              return currentVal;
            });
            break;
          }

          default:
            break;

          // TODO: anchor
          // TODO: rotation
          // TODO: easing function
        }

        if (effects.length > 0) {
          effects[0].delay = animationValueArray[0].t * frameTime;
          effectsGroup.push({
            name: animationNameMap[animationName].name,
            type: animationNameMap[animationName].type,
            effects,
          });
        }
      }
    }

    if (effectsGroup.length > 0) {
      const movieClip = {
        name: refId,
        remark: name,
        style,
        animation: {
          effectsGroup,
        },
      };
      movieClips.push(movieClip);
    }
  });
  return JSON.stringify({ movieClips });
};
