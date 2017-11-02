<template>
  <el-alert
    title="Ошибка"
    type="error"
    description="more text description"
    show-icon
    @close="onClose">
  </el-alert>
</template>

<script>
export default {
  methods: {
    onClose () {
      this.$emit('dismissed')
    }
  }
}
</script>

<style>

</style>
