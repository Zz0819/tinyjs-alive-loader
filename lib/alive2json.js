const PROPERTY_EXCHANGE_MAP = {
  opacity: 'alpha',
  move: 'position',
  rotate: 'rotation'
};
const EASE_FUNCTION_EXCHANGE_MAP = {
  linear: 'Linear.None',
  easeInQuad: 'Quadratic.In',
  easeOutQuad: 'Quadratic.Out',
  easeInOutCubic: 'Cubic.InOut',
  easeOutBack: 'Back.Out',
  easeOutElastic: 'Elastic.Out',
  easeOutBounce: 'Bounce.Out'
};
const MULTIPLE_PROPERTY_VALUE_MAP = {
  'position': [
    { key: 'x', initValueKey: 'left' },
    { key: 'y', initValueKey: 'top' }
  ],
  'scale': [
    { key: 'x', initValueKey: 'scaleX' },
    { key: 'y', initValueKey: 'scaleY' }
  ],
}
const parseClips = ({ curItem, nextItem, clipIndex, animationInitValue }) => {
  const { duration, easing, val, _val, delay, prevStartTime } = curItem;

  if (clipIndex === 0) {
    // 当当前片段为第一个动画片段时，根据动画描述标注，需要特殊处理补一个 startTime:0 的动画片段。
    const firstClip = {
      startTime: 0,
      value: animationInitValue,
      easeFunction: EASE_FUNCTION_EXCHANGE_MAP[ easing ],
      delay
    };
    const secondClip = { startTime: duration, value: _val || val }

    // 如果还有下一个动画片段，则根据描述文件标注，将 easeFunction 和 delay 附加在当前动画判断。
    if (nextItem) {
      secondClip.easeFunction = EASE_FUNCTION_EXCHANGE_MAP[ nextItem.easing ];
      secondClip.delay = nextItem.delay;
    }

    return [ firstClip, secondClip ];
  } else {
    const clip = {
      startTime: prevStartTime + duration,
      value: _val || val,
    }

    // 如果还有下一个动画片段，则根据描述文件标注，将 easeFunction 和 delay 附加在当前动画判断。
    if (nextItem) {
      clip.easeFunction = EASE_FUNCTION_EXCHANGE_MAP[ nextItem.easing ];
      clip.delay = nextItem.delay;
    }

    return [ clip ];
  }
}

const propertyConfigParser = (_effects, aliveInitValue) => {
  const { effects, type } = _effects;
  // 获取当前动画的属性名，如果不需要转换则直接使用喵动的属性名
  const propertyName = PROPERTY_EXCHANGE_MAP[ type ] || type;
  // 获取非简单类型值的属性的值配置列表。目前需要转换的属性是 position 和 scale。
  const multiplePropertyValues = MULTIPLE_PROPERTY_VALUE_MAP[ propertyName ];
  let propertyConfigList = [];

  // 当多值属性不为 undefined， 则按多值属性处理每个 clip
  if (multiplePropertyValues) {
    for (let i = 0, len = multiplePropertyValues.length; i < len; i++) {
      const { key, initValueKey } = multiplePropertyValues[ i ];
      // 根据配置重新生成 clip 的 property，例如 position.x、scale.x
      const property = `${propertyName}.${key}`;
      // 获取喵动默认的动画属性值
      const animationInitValue = aliveInitValue[ initValueKey ];
      const propertyConfig = {
        property,
        clips: []
      }

      for (let j = 0, len = effects.length; j < len; j++) {
        const curItem = effects[ j ];
        const nextItem = effects[ j + 1 ];
        // 兼容处理喵动多值属性的属性值，由于喵动的 scale 属性的 key 是 scaleX、scaleY，position 则为 x、y，所以需要做兼容处理。
        curItem._val = curItem.val[ key ] || curItem.val[ initValueKey ];

        // 从第二个动画片段开始，需要给 parseClips 方法传递已处理的最后一个动画片段的 startTime 值来计算下个动画片段的 startTime
        if (j > 0) {
          curItem.prevStartTime = propertyConfig.clips[ propertyConfig.clips.length - 1 ].startTime
        }

        if (nextItem) {
          nextItem._val = nextItem.val[ key ] || nextItem[ initValueKey ];
        }

        const clips = parseClips({
          curItem,
          nextItem,
          animationInitValue,
          clipIndex: j,
        });

        propertyConfig.clips.push(...clips);
      }

      propertyConfigList.push(propertyConfig);
    }

    return propertyConfigList;
  }

  const propertyConfig = {
    property: propertyName,
    clips: []
  };

  for (let i = 0, len = effects.length; i < len; i++) {
    const curItem = effects[ i ];
    const nextItem = effects[ i + 1 ];

    // 同多属性值处理
    if (i > 0) {
      curItem.prevStartTime = propertyConfig.clips[ propertyConfig.clips.length - 1 ].startTime;
    }

    const clips = parseClips({
      curItem,
      nextItem,
      animationInitValue: aliveInitValue[ curItem.type ],
      clipIndex: i
    });

    propertyConfig.clips.push(...clips);
  }

  propertyConfigList.push(propertyConfig);

  return propertyConfigList;
}

module.exports = (source) => {
  const aliveJSON = JSON.parse(source);
  const { movieClips } = aliveJSON;
  const animationConfig = {};

  for (let i = 0, len = movieClips.length; i < len; i++) {
    const { name, style = {}, animation: { effectsGroup = [] } } = movieClips[ i ];
    const animationName = name || `easyAnimation${i}`;

    if (!effectsGroup.length) {
      continue;
    }

    animationConfig[ animationName ] = [];
    for (let _effects of effectsGroup) {
      const propertyConfigList = propertyConfigParser(_effects, style);

      for (let propertyConfig of propertyConfigList) {
        const { clips } = propertyConfig;
        let validConfig = false;

        for (let i = 0, len = clips.length; i < len; i++) {
          if (!clips[ i + 1 ]) {
            break;
          }

          if (clips[ i ].value !== clips[ i + 1 ].value) {
            validConfig = true;
            break;
          }
        }

        if (!validConfig) {
          propertyConfigList.splice(propertyConfigList.indexOf(propertyConfig), 1);
        }
      }

      animationConfig[ animationName ].push(...propertyConfigList);
    }
  }

  return animationConfig;
}
