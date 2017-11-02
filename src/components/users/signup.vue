<template>
  <div>
    <h4>Регистрация</h4>
    <el-form :model="dynamicValidateForm" ref="dynamicValidateForm" label-width="120px" class="demo-dynamic">
      <el-form-item prop="email" label="Email" :rules="[
                                { required: true, message: 'Please input email address', trigger: 'blur' },
                                { type: 'email', message: 'Please input correct email address', trigger: 'blur,change' }
                              ]">
        <el-input v-model="dynamicValidateForm.email"></el-input>
      </el-form-item>
      <el-form-item label="Password" prop="pass">
        <el-input type="password" v-model="dynamicValidateForm.password" auto-complete="off"></el-input>
      </el-form-item>
      <el-form-item label="Проект" prop="project">
        <el-input v-model="dynamicValidateForm.project"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submitForm('dynamicValidateForm')">Зарегистрироваться</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  data () {
    return {
      dynamicValidateForm: {
        email: '',
        password: '',
        project: ''
      }
    }
  },
  computed: {
    user () {
      return this.$store.getters.user
    }
  },
  watch: {
    user (value) {
      if (value !== null && value !== undefined) {
        this.$router.push('/')
      }
    }
  },
  methods: {
    submitForm (formName) {
      this.$refs[formName].validate((valid) => {
        if (valid) {
          this.$store.dispatch('signupUser', this.dynamicValidateForm)
        } else {
          console.log('error submit!!')
          return false
        }
      })
    }
  }
}
</script>

<style>

</style>
