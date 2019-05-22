import Result from 'folktale/result'

export default shapeshifterType => action => action.type === shapeshifterType
  ? Result.Ok( action )
  : Result.Error( action )
