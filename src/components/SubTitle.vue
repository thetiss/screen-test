<script setup name="SubTitle">

defineProps({
  title: {
    type: String,
    required: true
  },
  detail: {
    type: String,
    default: '详情 >'
  }
})
const emit = defineEmits(['detailEvent'])

</script>

<template>
  <div class="sub-title bg-image">
    <div class="title">{{ title }}</div>
  </div>
</template>

<style lang="scss" scoped>
.sub-title {
  height: 49px;
  // width: 100%;
  width: 462px;
  //background-image: url('@/assets/images/sub-title-bg.png');
  display: flex;
  justify-content: space-between;

  .title {
    height: 24px;
    margin-left: 30px;
    transform: skewX(-10deg);
    font-family: PangMenZhengDao;
    font-size: 22px;
    font-weight: normal;
    line-height: 24px;
    letter-spacing: 2px;
    background: linear-gradient(180deg, #ecf3ff 15%, #cedcf4 80%);
    // box-shadow: 0px 0px 5px 0px #3c98ff;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .detail {
    margin: 9px 10px 0 0;
    width: 44px;
    height: 20px;
    background-color: #1c486e;
    border-radius: 4px;
    box-sizing: border-box;
    border: 1px solid rgba(70, 177, 255, 0.5);

    cursor: pointer;
    text-align: center;
    font-family: Source Han Sans;
    font-size: 12px;
    font-weight: normal;
    line-height: 20px;
    color: #46b1ff;
  }
  .detail:hover {
    background-color: #1c486e;
    color: #2f96df;
  }
}
</style>
